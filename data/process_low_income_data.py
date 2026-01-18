# process_low_income_data.py
import pandas as pd
import os

# CONFIGURATION
RAW_FILE = "RawData/Low Income Applications/LowIncome_Applications_Dataset_2026-01-08.csv"
PROCESSED_FOLDER = "ProcessedData"
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

# Shared comparison window with market: Apr 2015 -> Oct 2025
START_YEAR, START_MONTH = 2015, 4   # Apr
END_YEAR, END_MONTH     = 2025, 10  # Oct

month_order = {'Jan':1, 'Feb':2, 'Mar':3, 'Apr':4, 'May':5, 'Jun':6,
               'Jul':7, 'Aug':8, 'Sep':9, 'Oct':10, 'Nov':11, 'Dec':12}

# STEP 1: LOAD
print("Reading Low-Income records...")
cols = [
    "Host Customer Physical Address Zip Code",
    "Current Application Status",
    "Total System Cost",
    "CEC PTC Rating (KW)",
    "Incentive Amount",
    "First Completed Date",
]
df = pd.read_csv(RAW_FILE, usecols=cols, low_memory=False)

# STEP 2: CLEANING & FILTERING
print("Applying filters and formatting months as names...")
df = df[df["Current Application Status"] == "Completed"].copy()

# ZIP Validation
df["zip_code"] = (
    df["Host Customer Physical Address Zip Code"]
      .astype(str).str.split(".").str[0]
      .str.zfill(5)
)
df = df[df["zip_code"].str.match(r"^\d{5}$", na=False)].copy()

# Date Formatting
df["First Completed Date"] = pd.to_datetime(df["First Completed Date"], errors="coerce")
df["year"] = df["First Completed Date"].dt.year
df["month"] = df["First Completed Date"].dt.strftime("%b")
df["m_num"] = df["month"].map(month_order)

# Numeric Parsing (strip $ and commas; handle (123.45))
num_map = {
    "Total System Cost": "cost",
    "CEC PTC Rating (KW)": "kw",
    "Incentive Amount": "paid",
}
for old, new in num_map.items():
    s = df[old].astype(str)
    s = s.str.replace(r"[\$,]", "", regex=True)
    s = s.str.replace(r"^\((.*)\)$", r"-\1", regex=True)
    df[new] = pd.to_numeric(s, errors="coerce")

# Zero-tolerance filter
df = df.dropna(subset=["year", "m_num", "cost", "kw", "paid"])
df = df[(df["cost"] > 0) & (df["kw"] > 0)].copy()

# Exclude rows where incentives > cost
df = df[df["paid"] <= df["cost"]].copy()

# NEW: Restrict to shared market window (Apr 2015 -> Oct 2025)
df = df[
    ((df["year"] > START_YEAR) | ((df["year"] == START_YEAR) & (df["m_num"] >= START_MONTH))) &
    ((df["year"] < END_YEAR)   | ((df["year"] == END_YEAR)   & (df["m_num"] <= END_MONTH)))
].copy()

# STEP 3: SUMMARIZE (AGGREGATION)
print("Aggregating to ZIP x month x year (comparison window)...")
summary = (
    df.groupby(["zip_code", "year", "month", "m_num"], as_index=False)
      .agg(
          subsidy_total_cost=("cost", "sum"),
          subsidy_total_kw=("kw", "sum"),
          subsidy_total_paid=("paid", "sum"),
          subsidy_count=("cost", "count"),
      )
)

# Sort chronologically
summary = summary.sort_values(["year", "m_num", "zip_code"]).drop(columns=["m_num"])

# STEP 4: EXPORT
output_file = os.path.join(PROCESSED_FOLDER, "low_income_summary_final.csv")
summary.to_csv(output_file, index=False, float_format="%.2f")
print(f"COMPLETE: ZIP x time summary saved to {output_file}")

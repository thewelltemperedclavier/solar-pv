# process_market_data.py
import pandas as pd
import os

RAW_FOLDER = "RawData/Interconnected Project Sites"
PROCESSED_FOLDER = "ProcessedData"
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

market_files = [
    "PGE_Interconnected_Project_Sites_Historical-Jan2020.csv",
    "PGE_Interconnected_Project_Sites_Jan2020-Oct2025.csv",
    "SCE_Interconnected_Project_Sites_Historical-Jan2020.csv",
    "SCE_Interconnected_Project_Sites_Jan2020-Oct2025.csv",
    "SDGE_Interconnected_Project_Sites_Historical-Oct2025.csv"
]

print("Reading and merging market files...")
all_data = []
for f in market_files:
    path = os.path.join(RAW_FOLDER, f)
    if os.path.exists(path):
        cols = [
            "Service Zip",
            "Total System Cost",
            "System Size AC",
            "Application Status",
            "App Complete Date",
            "Customer Sector",
        ]
        all_data.append(pd.read_csv(path, usecols=cols, low_memory=False))

if not all_data:
    raise FileNotFoundError("No market files found. Check RAW_FOLDER and filenames.")

df = pd.concat(all_data, ignore_index=True)

print("Applying Residential and Status filters...")

df["Customer Sector"] = df["Customer Sector"].fillna("Unknown").astype(str).str.strip().str.upper()
df = df[df["Customer Sector"] == "RESIDENTIAL"].copy()

df = df[df["Application Status"].astype(str).str.contains("Interconnected", na=False, case=False)].copy()

df["zip_code"] = df["Service Zip"].astype(str).str.split(".").str[0].str.zfill(5)
df = df[df["zip_code"].str.match(r"^\d{5}$", na=False)].copy()

df["App Complete Date"] = pd.to_datetime(df["App Complete Date"], errors="coerce")
df["year"] = df["App Complete Date"].dt.year
df["month"] = df["App Complete Date"].dt.strftime("%b")

for col in ["Total System Cost", "System Size AC"]:
    s = df[col].astype(str)
    s = s.str.replace(r"[\$,]", "", regex=True)
    s = s.str.replace(r"^\((.*)\)$", r"-\1", regex=True)
    df[col] = pd.to_numeric(s, errors="coerce")

df = df.dropna(subset=["year", "month", "Total System Cost", "System Size AC"])
df = df[(df["Total System Cost"] > 0) & (df["System Size AC"] > 0)].copy()

print("Aggregating to ZIP x year x month...")
summary = (
    df.groupby(["zip_code", "year", "month"], as_index=False)
      .agg(
          market_total_cost=("Total System Cost", "sum"),
          market_total_kw=("System Size AC", "sum"),
          market_count=("Total System Cost", "count"),
      )
)

# Round first, then filter: total cost must be >= $50
summary["market_total_cost"] = summary["market_total_cost"].round(2)
summary["market_total_kw"] = summary["market_total_kw"].round(2)
summary = summary[(summary["market_total_cost"] >= 50) & (summary["market_total_kw"] > 0)].copy()

month_order = {'Jan':1, 'Feb':2, 'Mar':3, 'Apr':4, 'May':5, 'Jun':6,
               'Jul':7, 'Aug':8, 'Sep':9, 'Oct':10, 'Nov':11, 'Dec':12}
summary["m_num"] = summary["month"].map(month_order)
summary = summary.sort_values(["year", "m_num", "zip_code"]).drop(columns=["m_num"])

output_file = os.path.join(PROCESSED_FOLDER, "market_summary_final.csv")
summary.to_csv(output_file, index=False)

print("Wrote:", os.path.abspath(output_file))
print(f"COMPLETE: Residential-only Market Summary saved to {output_file}")

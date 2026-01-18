import pandas as pd
import os

# CONFIGURATION
PROCESSED_FOLDER = "ProcessedData"
MARKET_FILE = os.path.join(PROCESSED_FOLDER, "market_summary_final.csv")
SUBSIDY_FILE = os.path.join(PROCESSED_FOLDER, "low_income_summary_final.csv")
OUTPUT_FILE = os.path.join(PROCESSED_FOLDER, "master_solar_summary.csv")

print("Loading summaries...")
df_market = pd.read_csv(MARKET_FILE)
df_subsidy = pd.read_csv(SUBSIDY_FILE)

# STEP 1: PREP FOR JOIN
# Distinct names for installation counts to avoid collision
df_market = df_market.rename(columns={'number_of_installations': 'market_count'})
df_subsidy = df_subsidy.rename(columns={'number_of_installations': 'subsidy_count'})

# Shared keys for the merge
join_keys = ['zip_code', 'utility', 'year', 'month', 'city', 'county']

# STEP 2: MERGE DATASETS
print("Merging Market and Subsidy data...")
# Outer join preserves every neighborhood-month record from both sources
master_df = pd.merge(df_market, df_subsidy, on=join_keys, how='outer')

# STEP 3: DATA INTEGRITY
# Replace NaNs with 0 for all mathematical columns
math_cols = [
    'market_total_cost', 'market_total_kw', 'market_count',
    'subsidy_total_cost', 'subsidy_total_kw', 'subsidy_total_paid', 'subsidy_count'
]
master_df[math_cols] = master_df[math_cols].fillna(0)

# Chronological sorting logic
month_map = {'Jan':1, 'Feb':2, 'Mar':3, 'Apr':4, 'May':5, 'Jun':6, 
             'Jul':7, 'Aug':8, 'Sep':9, 'Oct':10, 'Nov':11, 'Dec':12}
master_df['month_num'] = master_df['month'].map(month_map)
master_df = master_df.sort_values(['year', 'month_num', 'zip_code']).drop(columns=['month_num'])

# STEP 4: EXPORT
master_df.to_csv(OUTPUT_FILE, index=False, float_format='%.2f')

print(f"SUCCESS: Master Summary created at {OUTPUT_FILE}")
print(f"Total Combined Rows: {len(master_df)}")
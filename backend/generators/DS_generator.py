from models.KG import KG
from config import DS_DIR, KG_PATH, NUM_COLS, NUM_ROWS, PERC_NOISE, PERC_COLUMNS, TEXT, N_DIMENSIONS, N_LEVELS
import math
import pandas as pd
import numpy as np
from time import time
import random
from datetime import datetime, timedelta


def pick_level(levels):
    return random.choice(levels)


def random_text(text_length=5):
    text = ""
    size = len(words)
    for _ in range(text_length):
        text += f" {words[random.randint(0, size-1)]}"
    return text


def generate_date(start_date, end_date, size):
    # Create a list to store the generated dates
    date_list = []

    # Calculate the total number of days between the start and end dates
    total_days = (end_date - start_date).days

    # Generate random dates and add them to the list until the desired size is reached
    while len(date_list) < size:
        random_days = random.randint(0, total_days)
        random_date = start_date + timedelta(days=random_days)
        date_list.append(random_date)

    return date_list


def generate_ds(n_rows, n_columns, perc_noise, perc_columns, n_categories=4):
    n_levels = math.floor(n_columns * perc_columns["level"])
    n_integers = math.floor(n_columns * perc_columns["integer"])
    n_reals = math.floor(n_columns * perc_columns["real"])
    n_categorical = math.floor(n_columns * perc_columns["categorical"])
    n_datetime = math.floor(n_columns * perc_columns["date"])
    n_string = math.floor(n_columns * perc_columns["string"])

    # Initialize DataFrame
    df = pd.DataFrame()

    print(f"\t-> {n_levels} level columns;")
    for count in range(0, n_levels):
        # Generate members and add noise
        r_level = np.random.randint(low=0, high=N_LEVELS)
        r_dimension = np.random.randint(low=0, high=N_DIMENSIONS)
        level = f"L{r_level}_D{r_dimension}"
        members = kg.get_members_from_level(level, True, True)

        n_noise = math.floor(n_rows * perc_noise)
        n_values = n_rows - n_noise
        list_values = random.choices(members, k=n_values)

        # generates the noise elements
        list_noise = ['x'] * n_noise
        all_values = list_values + list_noise

        # Shuffle values and add the column
        np.random.shuffle(all_values)
        df[level] = all_values

    print(f"\t-> {n_integers} integer columns;")
    for count in range(0, n_integers):
        all_values = np.random.randint(low=0, high=n_rows, size=n_rows)
        np.random.shuffle(all_values)
        df[f"int_{count}"] = all_values

    print(f"\t-> {n_reals} real columns;")
    for count in range(0, n_reals):
        all_values = [round(random.uniform(a=0, b=n_rows), 5) for _ in range(0, n_rows)]
        np.random.shuffle(all_values)
        df[f"real_{count}"] = all_values

    print(f"\t-> {n_datetime} date columns;")
    for count in range(0, n_datetime):
        all_values = generate_date(start_date=datetime(1700, 1, 1), end_date=datetime(2050, 1, 1), size=n_rows)
        np.random.shuffle(all_values)
        df[f"date_{count}"] = all_values

    print(f"\t-> {n_categorical} categorical columns;")
    categories = [f"c_{i}" for i in range(0, n_categories-1)]
    for count in range(0, n_categorical):
        all_values = np.random.choice(categories, size=n_rows)
        np.random.shuffle(all_values)
        df[f"cat_{count}"] = all_values

    print(f"\t-> {n_string} string columns;")
    for count in range(0, n_string):
        all_values = [random_text() for _ in range(0, n_rows)]
        np.random.shuffle(all_values)
        df[f"str_{count}"] = all_values

    print("Shuffling and saving.")
    df = df[np.random.default_rng(seed=42).permutation(df.columns.values)]

    return df


def main():
    global kg
    global words
    print("\nImporting the knowledge graph...")
    kg = KG(KG_PATH)

    file_text = open(TEXT)
    words = file_text.read().split(" ")

    for num_cols in sorted(NUM_COLS):
        for num_rows in sorted(NUM_ROWS):
            for noise in sorted(PERC_NOISE):
                base_timestamp = time()
                perc_noise = noise/100.0
                print(f"\nGenerating a dataset with {num_rows} rows, {num_cols} columns and {noise} noise...")

                df = generate_ds(num_rows, num_cols, perc_noise, PERC_COLUMNS)
                df.to_csv(f"{DS_DIR}ds_C{num_cols}_R{num_rows}_n{noise}.csv", sep=',')

                print(f"Done in {time()-base_timestamp}s.")


if __name__ == "__main__":
    main()

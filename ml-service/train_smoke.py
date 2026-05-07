import os
import tempfile

from train import train_model


def main():
    temp_dir = tempfile.mkdtemp(prefix="ml_smoke_")
    model_path, priority_model_path, metrics_path, metadata_path = train_model(
        data_path=os.path.join(os.path.dirname(__file__), "data.csv"),
        out_dir=temp_dir,
        model_path=None,
        test_size=0.2,
        seed=42,
        sample_rows=500,
        model_type="logistic",
        c_value=1.0,
        class_weight="balanced",
        max_iter=2000,
        ngram_max=2,
        min_df=2,
        max_features=None,
        calibrate=False,
        bert_enabled=False,
        bert_model_name="all-MiniLM-L6-v2"
    )

    print("Smoke training complete")
    print(f"Model: {model_path}")
    print(f"Priority model: {priority_model_path}")
    print(f"Metrics: {metrics_path}")
    print(f"Metadata: {metadata_path}")


if __name__ == "__main__":
    main()

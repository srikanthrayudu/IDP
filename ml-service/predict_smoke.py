from app import app


def main():
    with app.test_client() as client:
        response = client.post("/predict", json={"text": "pothole on the main road near the signal"})
        print("Status:", response.status_code)
        print("Response:", response.get_json())


if __name__ == "__main__":
    main()


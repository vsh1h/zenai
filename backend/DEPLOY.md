# Deployment Instructions

## Local Development
1.  **Environment**: Ensure you have Python 3.9+ installed.
2.  **Virtual Environment**: Create and activate a venv:
    ```bash
    python -m venv venv
    source venv/bin/activate  
    ```
3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run Server**:
    ```bash
    uvicorn main:app --reload --port 8000
    ```

## Cloud Deployment (Render / Railway)
1.  **Push to GitHub**: Commit your changes and push to a GitHub repository.
2.  **Configuration**: 
    *   Connect your GitHub repo.
    *   Set the Root Directory to `backend`.
    *   Set the Build Command to `pip install -r requirements.txt`.
    *   Set the Start Command to `uvicorn main:app --host 0.0.0.0 --port $PORT`.
    *   **Environment Variables**: Add `SUPABASE_URL` and `SUPABASE_KEY` in the dashboard.

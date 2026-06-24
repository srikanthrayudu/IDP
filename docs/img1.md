# Image Generation Prompt for Figure 1: System Architecture Diagram

**Filename in LaTeX:** `img1.png`
**Target Section:** System Architecture

### Image Description & Purpose
This image will visually represent the entire Smart City Grievance Redressal System's architecture. It should show how the different components (Frontend, Backend, ML Service, and Database) interact with each other in a containerized environment. This image is crucial for the reader to understand the data flow from a citizen's device through to the AI prediction engine.

### Suggested AI Image Generator Prompt
> Create a clean, professional, academic system architecture diagram for a smart city application. The diagram should have three main vertical tiers from left to right:
> 
> 1.  **Frontend Tier (Client):** Show icons for "Citizens", "Ward Members", and "Admins" accessing a "React (Vite) Dashboard".
> 2.  **Backend Tier (Server):** Show a central block labeled "Spring Boot API" with an attached "PostgreSQL Database" icon and a "JWT Security" lock icon. Connect the Frontend block to this block with arrows labeled "REST API / JSON".
> 3.  **Intelligence Tier (ML):** Show a block labeled "Flask ML Service" containing "Logistic Regression" and "SHAP Explainer" sub-blocks. Connect the Spring Boot block to this block with bi-directional arrows.
> 
> Draw a dashed box around the Backend and Intelligence tiers labeled "Podman Containerized Environment". Use a modern, minimalist technical style suitable for an IEEE research paper. Use a white background, sharp blue and gray lines, and clear, legible typography. Do not include random abstract shapes; keep it structured like a software engineering block diagram.

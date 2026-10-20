# MedEcho-Verify

MedEcho-Verify is a web-based application that I developed to help reduce documentation errors in chest X-ray reporting. The main idea behind this project is simple: the system checks whether the doctor's clinical note matches what the AI detects from the uploaded chest X-ray image. If both match, the report is marked as consistent. If there is a mismatch, especially in the left and right lung information, the system immediately highlights it.

The purpose of this project is not to replace doctors but to provide an additional safety check that can help reduce human errors during reporting.

---

## Features

* Upload chest X-ray images
* Enter or paste a clinical note
* AI-based chest X-ray analysis using ResNet18
* Calculates a Cross-Modal Consistency Index (CMCI) score
* Detects left/right (laterality) mismatches
* Displays clear alerts and prediction results on a simple dashboard
* Easy-to-use and responsive user interface

---

## Technologies Used

### Frontend

* React.js
* Tailwind CSS
* Axios

### Backend

* Python
* FastAPI
* Uvicorn

### AI / Machine Learning

* PyTorch
* Torchvision
* ResNet18 (Transfer Learning)
* OpenCV
* Pillow (PIL)
* NumPy

---

## How the Project Works

1. The user uploads a chest X-ray image.
2. A clinical note is entered by the doctor.
3. The image is sent to the backend where the AI model analyzes it.
4. The clinical note is processed to identify important medical terms such as disease name and laterality (left/right).
5. The system compares the findings from both the image and the text.
6. A CMCI score is calculated to show how well both match.
7. If a left-right mismatch is detected, the system immediately generates a critical alert.

---

## Project Structure

```
MedEcho-Verify/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── model.pth
│
├── frontend/
│   ├── src/
│   ├── package.json
│
└── README.md
```

---

## Installation

Clone the repository.

```bash
git clone https://github.com/your-username/MedEcho-Verify.git
```

Move into the project directory.

```bash
cd MedEcho-Verify
```

---

## Running the Backend

Go to the backend folder.

```bash
cd backend
```

Create a virtual environment.

```bash
python -m venv venv
```

Activate the virtual environment.

**Windows**

```bash
venv\Scripts\activate
```

Install the required packages.

```bash
pip install -r requirements.txt
```

Run the FastAPI server.

```bash
uvicorn main:app --reload
```

The backend will start on:

```
http://127.0.0.1:8000
```

---

## Running the Frontend

Open another terminal and move to the frontend folder.

```bash
cd frontend
```

Install dependencies.

```bash
npm install
```

Start the application.

```bash
npm run dev
```

or

```bash
npm start
```

depending on your project setup.

---

## Future Improvements

Some features that can be added in the future are:

* Detection of more chest diseases
* Explainable AI using Grad-CAM
* Speech-to-text support for doctor's dictation
* DICOM image support
* Integration with hospital information systems

---


## Screenshots

### Homepage

<img src="https://github.com/user-attachments/assets/fa4f6dc3-9dab-42d9-b869-3ea85c6ed435" alt="MedEcho-Verify Homepage" width="100%" />

### Analysis Dashboard

<img src="https://github.com/user-attachments/assets/50c1593e-5543-46bd-ade6-ade035cb03bd" alt="MedEcho-Verify Analysis Dashboard" width="100%" />


## About This Project

I built this project as a learning experience to explore the combination of Artificial Intelligence and web development in the healthcare domain. Through this project, I gained hands-on experience with React, FastAPI, deep learning using PyTorch, REST APIs, and deploying AI models in a web application. The project also helped me understand how AI can be used as a decision-support tool to improve patient safety.

---

## Author

**Gitabai Sidramappa Sabane**

Final Year B.Tech Computer Science & Engineering

Walchand Institute of Technology, Solapur

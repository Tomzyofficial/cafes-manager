# Overview

As a software engineer, I wanted to get hands-on experience connecting a web application to a cloud-hosted NoSQL database and handling real-time data synchronization a pattern used constantly in production apps (chat apps, live dashboards, collaborative tools) but one I hadn't built from scratch before. This project was my way of practicing that end-to-end: designing a data model, wiring up CRUD operations against a cloud database, and layering a live-update mechanism on top so the UI reflects changes the instant they happen, from any source.

The software is a **Cafes Manager** web app built with Python (Flask) on the backend and vanilla HTML/CSS/JavaScript on the frontend. It lets a user manage a list of cafes, each with a **name** and a **city**, and stores that data in **Google Firestore**, a cloud-hosted NoSQL document database. The app supports full CRUD:

- **Create**: a form with Name and City fields and a Save button inserts a new cafe document into Firestore.
- **Read**: on page load, the app fetches and displays every cafe currently stored in Firestore in a table.
- **Update**: clicking Edit on a row loads that cafe into the form; submitting it updates the existing Firestore document rather than creating a new one.
- **Delete**: clicking Delete on a row removes that cafe's document from Firestore.

Beyond basic CRUD, the app also listens for real-time changes on the Firestore collection using a background listener, and pushes those changes out to every connected browser tab over a WebSocket connection (via Flask-SocketIO). This means if a cafe is added, edited, or deleted whether through the app's own UI or directly inside the Firestore console every open browser tab updates instantly and shows a toast notification describing what changed, with no page refresh required.

My purpose in building this was to strengthen my understanding of cloud database integration patterns and real-time data sync skills directly relevant to the kind of full-stack marketplace and platform work I do professionally, where live data updates (inventory changes, order status, listings) are a common requirement.

# Cloud Database

I used **Google Firestore**, the NoSQL document database included in Google's Firebase platform. Firestore was a good fit for this project because it's fully managed (no server to provision or maintain), it has a straightforward Python SDK (`firebase-admin`), and most importantly for this project it has built-in real-time listener support, which let me implement live notifications without building my own polling or messaging infrastructure.

The database structure is intentionally simple, consisting of a single collection:

- **Collection:** `cafes`
  - Each **document** represents one cafe and has two fields:
    - `name` (string)
    - `city` (string)
  - Firestore auto-generates a unique document ID for each cafe, which the app uses to target update and delete operations.

# Development Environment

I developed this project locally using:

- **VS Code** as my code editor
- **Python** with a virtual environment (`venv`) to isolate project dependencies
- **Git** for version control
- The **Firebase Console** to create the Firestore database and generate a service account credentials file
- A local browser (Chrome) for testing the frontend and real-time behavior across multiple tabs

The programming language used was **Python** for the backend, with **JavaScript** for the frontend. Key libraries and frameworks:

- **Flask**: lightweight backend web framework serving the HTML page and REST API endpoints
- **Flask-SocketIO**: WebSocket layer used to push real-time update events to connected browsers
- **firebase-admin**: official Python SDK for authenticating with and querying/writing to Firestore, and for attaching the real-time snapshot listener
- **python-dotenv**: loads configuration (credentials path, port) from a local `.env` file rather than hardcoding it
- **Socket.IO client** (via CDN) frontend counterpart to Flask-SocketIO, used to receive real-time events in the browser

# Useful Websites

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Python Client Reference](https://googleapis.dev/python/firestore/latest/index.html)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Flask-SocketIO Documentation](https://flask-socketio.readthedocs.io/)
- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)

# Future Work

- Add basic form-level validation and sanitization to prevent duplicate or malformed cafe entries (e.g., trimming whitespace consistently, rejecting overly long input).
- Add proper Firestore security rules instead of relying on test mode, and add user authentication so cafe data isn't publicly writable.
- Add a search/filter box on the frontend so users can quickly find cafes by name or city as the list grows.
- Add pagination or lazy loading for the cafe list to keep performance reasonable if the collection grows large.

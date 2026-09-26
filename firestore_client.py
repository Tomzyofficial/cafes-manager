"""
firestore_client.py

Handles Firestore initialization and all CRUD helper functions
for the 'cafes' collection.
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore

COLLECTION_NAME = "cafes"

_db = None


def init_firestore():
    """
    Initialize the Firebase Admin SDK and return a Firestore client.
    Reads the service account key path from the GOOGLE_APPLICATION_CREDENTIALS
    environment variable. Safe to call multiple times (returns cached client).
    """
    global _db
    if _db is not None:
        return _db

    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not cred_path:
        raise RuntimeError(
            "GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. "
            "Point it to your Firebase service account JSON file."
        )
    if not os.path.exists(cred_path):
        raise RuntimeError(
            f"Service account file not found at '{cred_path}'. "
            "Check the GOOGLE_APPLICATION_CREDENTIALS path in your .env file."
        )

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    _db = firestore.client()
    return _db


def get_collection():
    """Return a reference to the 'cafes' collection."""
    db = init_firestore()
    return db.collection(COLLECTION_NAME)


def cafe_to_dict(doc_snapshot):
    """Convert a Firestore document snapshot into a plain dict with 'id'."""
    data = doc_snapshot.to_dict() or {}
    return {
        "id": doc_snapshot.id,
        "name": data.get("name", ""),
        "city": data.get("city", ""),
    }


def get_all_cafes():
    """Return a list of all cafes as dicts."""
    docs = get_collection().stream()
    return [cafe_to_dict(doc) for doc in docs]


def add_cafe(name, city):
    """Insert a new cafe document. Returns the created cafe dict."""
    doc_ref = get_collection().document()
    doc_ref.set({"name": name, "city": city})
    return {"id": doc_ref.id, "name": name, "city": city}


def update_cafe(doc_id, name, city):
    """
    Update an existing cafe document.
    Raises ValueError if the document does not exist.
    """
    doc_ref = get_collection().document(doc_id)
    if not doc_ref.get().exists:
        raise ValueError(f"Cafe with id '{doc_id}' does not exist.")
    doc_ref.update({"name": name, "city": city})
    return {"id": doc_id, "name": name, "city": city}


def delete_cafe(doc_id):
    """
    Delete a cafe document.
    Raises ValueError if the document does not exist.
    """
    doc_ref = get_collection().document(doc_id)
    if not doc_ref.get().exists:
        raise ValueError(f"Cafe with id '{doc_id}' does not exist.")
    doc_ref.delete()
    return {"id": doc_id}
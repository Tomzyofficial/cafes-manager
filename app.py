import os

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify, render_template
from flask_socketio import SocketIO

import firestore_client as fc

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key")

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# Keeps track of whether the Firestore listener has already been started,
# so we don't attach it twice (e.g. under the Flask reloader).
_listener_started = False

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/cafes", methods=["GET"])
def api_get_cafes():
    try:
        cafes = fc.get_all_cafes()
        return jsonify(cafes), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/cafes", methods=["POST"])
def api_add_cafe():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    city = (data.get("city") or "").strip()

    if not name or not city:
        return jsonify({"error": "Both 'name' and 'city' are required."}), 400

    try:
        cafe = fc.add_cafe(name, city)
        return jsonify(cafe), 201
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/cafes/<doc_id>", methods=["PUT"])
def api_update_cafe(doc_id):
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    city = (data.get("city") or "").strip()

    if not name or not city:
        return jsonify({"error": "Both 'name' and 'city' are required."}), 400

    try:
        cafe = fc.update_cafe(doc_id, name, city)
        return jsonify(cafe), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/cafes/<doc_id>", methods=["DELETE"])
def api_delete_cafe(doc_id):
    try:
        result = fc.delete_cafe(doc_id)
        return jsonify(result), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

# Real-time Firestore listener -> WebSocket broadcast
def _on_snapshot(col_snapshot, changes, read_time):
    """
    Firestore calls this callback (on its own background thread) whenever
    the 'cafes' collection changes. We translate each change into a
    'cafe_update' event and broadcast it to every connected browser tab.
    """
    for change in changes:
        doc = change.document
        data = doc.to_dict() or {}
        payload = {
            "type": change.type.name,  # 'ADDED', 'MODIFIED', or 'REMOVED'
            "id": doc.id,
            "name": data.get("name", ""),
            "city": data.get("city", ""),
        }
        # Firestore's callback runs on its own thread, not eventlet's,
        # so we hand off to socketio to emit safely.
        socketio.emit("cafe_update", payload)


def start_firestore_listener():
    """Attach the real-time snapshot listener to the 'cafes' collection."""
    global _listener_started
    if _listener_started:
        return
    collection_ref = fc.get_collection()
    collection_ref.on_snapshot(_on_snapshot)
    _listener_started = True
    print("Firestore real-time listener started on 'cafes' collection.")


@socketio.on("connect")
def handle_connect():
    print("Client connected.")


if __name__ == "__main__":
    start_firestore_listener()
    port = int(os.environ.get("PORT", 5000))
    # allow_unsafe_werkzeug=True lets us use Flask's dev server directly
    # with threading mode; fine for local development.
    socketio.run(
        app,
        host="0.0.0.0",
        port=port,
        debug=True,
        use_reloader=False,
        allow_unsafe_werkzeug=True,
    )
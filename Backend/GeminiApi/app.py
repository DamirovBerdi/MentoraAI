from flask import Flask, request, jsonify
import os
import logging

from ai_functions import topic_summarizer, answer_analyze, generate_flash_cards

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'ok': True, 'service': 'gemini-api'})


@app.route('/summarize', methods=['POST'])
def summarize():
    data = request.get_json() or {}
    topic = data.get('topic')
    content = data.get('content')
    if not topic or not content:
        return jsonify({'error': 'missing_fields', 'required': ['topic','content']}), 400
    try:
        text = topic_summarizer(topic, content)
        return jsonify({'ok': True, 'result': text})
    except Exception as e:
        logging.exception('summarize failed')
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json() or {}
    question = data.get('question')
    answer = data.get('answer')
    if not question or answer is None:
        return jsonify({'error': 'missing_fields', 'required': ['question','answer']}), 400
    try:
        res = answer_analyze(question, answer)
        return jsonify({'ok': True, 'result': res.model_dump() if hasattr(res, 'model_dump') else res.dict()})
    except Exception as e:
        logging.exception('analyze failed')
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/flashcards', methods=['POST'])
def flashcards():
    data = request.get_json() or {}
    topic = data.get('topic')
    content = data.get('content')
    if not topic or not content:
        return jsonify({'error': 'missing_fields', 'required': ['topic','content']}), 400
    try:
        cards = generate_flash_cards(topic, content)
        # convert Pydantic models to dicts
        arr = [c.model_dump() if hasattr(c, 'model_dump') else c.dict() for c in cards]
        return jsonify({'ok': True, 'cards': arr})
    except Exception as e:
        logging.exception('flashcards failed')
        return jsonify({'ok': False, 'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)

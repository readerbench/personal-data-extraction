from flask import Flask, request
import index as Extractor_AGE


app = Flask(__name__)


@app.route('/', methods=['POST'])
def extract():
    return Extractor_AGE.extract(request.json["text"])


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10011, debug=True, processes=1, threaded=True)

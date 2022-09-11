from flask import Flask, request
import index as Extractor_FIRSTNAME


app = Flask(__name__)


@app.route('/', methods=['POST'])
def extract():
    return Extractor_FIRSTNAME.extract(request.json["text"])


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10012, debug=True, processes=1, threaded=True)

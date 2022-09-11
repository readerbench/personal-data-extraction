import pandas as pd
import numpy as np
from tensorflow import keras
from flask import Flask, request


model = keras.models.load_model('outgoing/address_model/model')
app = Flask(__name__)


@app.route('/', methods=['POST'])
def predict():
    features = request.json["features"]
    df = pd.DataFrame(features)
    x = df.values.reshape(-1, 5, 10, order='C')
    y = model.predict(x)
    y_cat = np.argmax(y, axis=-1)
    return {"prediction": np.array(y_cat).tolist()}


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9999, debug=True, processes=1, threaded=True)

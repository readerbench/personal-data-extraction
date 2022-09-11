### Requirements
* Node.js >= v16.16.0
* Python >= v3.8

### Setup Steps
1. **Install the _Node.js_ modules** \
   From [node](node) directory run: 
    ```
    npm install
    ```
2. **Install the _Python_ packages** \
   From [python](python) directory run:
    ```
    python3 -m venv ./venv
    ./venv/bin/pip3 install -r requirements.txt
    ```
3. **Download the [spacy](https://spacy.io/models/ro#ro_core_news_lg) `ro_core_news_lg` model (~570MB)** \
   From [python](python) directory run:
   ```
   ./venv/bin/python -m spacy download ro_core_news_lg
   ```



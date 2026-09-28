## Requisiti e installazione

È richiesto **Python 3.10**.

Da questa directory, creare e attivare un ambiente virtuale:

```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

Su Linux/macOS è:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Avvio

Avviare il server API dalla root del progetto:

```bash
python runtime/api.py
```

Il server sarà raggiungibile su `http://127.0.0.1:5000`.
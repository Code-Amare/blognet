import os
import subprocess
import sys


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CERT_PATH = os.path.abspath(
    os.path.join(BASE_DIR, "..", "certs", "cert.pem")
)

KEY_PATH = os.path.abspath(
    os.path.join(BASE_DIR, "..", "certs", "key.pem")
)


def main():
    python = sys.executable

    command = [
        python,
        "-m",
        "uvicorn",

        "core.asgi:application",

        "--host",
        "0.0.0.0",

        "--port",
        "8000",

        "--ssl-certfile",
        CERT_PATH,

        "--ssl-keyfile",
        KEY_PATH,


        "--reload",

        "--reload-dir",
        BASE_DIR,

        "--lifespan",
        "off",
    ]

    print("Starting Django HTTPS server...")
    print("HTTPS: https://localhost:8000")
    print("WebSocket: wss://localhost:8000")
    print()

    subprocess.run(
        command,
        cwd=BASE_DIR,
    )


if __name__ == "__main__":
    main()
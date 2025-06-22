import requests

def upload_to_yandex_disk(token, file_path, local_file):

# 1. Получаем ссылку для загрузки

  upload_url = "https://cloud-api.yandex.net/v1/disk/resources/upload"
  headers = {"Authorization": f"OAuth {token}"}
  params = {"path": file_path, "overwrite": "true"}
  
  try:
    # Проверяем токен
    check_auth = requests.get(
      "https://cloud-api.yandex.net/v1/disk/",
       headers=headers
    )
    if check_auth.status_code == 401:
       raise ValueError("❌ Токен недействителен! Обновите токен.")

    # Запрашиваем ссылку для загрузки
    response = requests.get(upload_url, headers=headers, params=params)
    response.raise_for_status()  # Проверяем HTTP-ошибки
    data = response.json()

    if "href" not in data:
      raise ValueError(f"API не вернул ссылку. Ответ: {data}")
    # Загружаем файл
    with open(local_file, "rb") as f:
      upload_response = requests.put(data["href"], files={"file": f})
      upload_response.raise_for_status()

    print("✅ Файл успешно загружен!")
    return True
  except requests.exceptions.RequestException as e:
    print(f"❌ Ошибка при загрузке: {e}")
    return False

# Пример вызова

upload_to_yandex_disk(
  token="y0__xCVkp5xGN-9OCDpjabKEypQzSZ371Ma47Cf74I46WGeEqBf",
  file_path="video_test/1/2.mp4", # Путь на Яндекс.Диске
  local_file="D:/MyDev/forgejo/Youtube-Telegram/video/1.mp4"   # Локальный путь к файлу
)
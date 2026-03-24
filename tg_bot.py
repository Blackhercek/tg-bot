import telebot
import os
import requests
from flask import Flask, request

TOKEN = os.getenv("5185489735:AAH4etIhtGzXW2YT5JqKAJNIbVT53B6u38o")
WEATHER_API_KEY = os.getenv("438821ab4af5f999a549a37ab2169efa")

bot = telebot.TeleBot(TOKEN)
app = Flask(__name__)


def get_weather():
    """Получает погоду в Минске"""
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q=Minsk&appid={WEATHER_API_KEY}&units=metric&lang=ru"
        response = requests.get(url, timeout=5)
        data = response.json()

        if response.status_code == 200:
            temp = data['main']['temp']
            feels_like = data['main']['feels_like']
            description = data['weather'][0]['description']
            humidity = data['main']['humidity']
            wind_speed = data['wind']['speed']

            weather_text = f"""
🌍 Погода в Минске

🌡️ Температура: {temp}°C
🤔 Ощущается как: {feels_like}°C
☁️ Описание: {description}
💧 Влажность: {humidity}%
💨 Ветер: {wind_speed} м/с
            """
            return weather_text.strip()
        else:
            return "❌ Не удалось получить данные о погоде"
    except Exception as e:
        return f"❌ Ошибка: {str(e)}"


# Хендлеры
@bot.message_handler(commands=['start'])
def start(message):
    bot.reply_to(message,
                 "👋 Привет! Я бот погоды для Минска!\n\n"
                 "Команды:\n"
                 "/weather - узнать текущую погоду\n"
                 "/start - это сообщение"
                 )


@bot.message_handler(commands=['weather'])
def weather(message):
    bot.send_message(message.chat.id, "⏳ Получаю данные...")
    weather_info = get_weather()
    bot.send_message(message.chat.id, weather_info)


@bot.message_handler(func=lambda message: True)
def echo(message):
    bot.reply_to(message,
                 "Я понимаю только команды:\n"
                 "/weather - погода в Минске\n"
                 "/start - помощь"
                 )


# Webhook endpoint
@app.route('/' + TOKEN, methods=['POST'])
def webhook():
    json_str = request.get_data().decode('UTF-8')
    update = telebot.types.Update.de_json(json_str)
    bot.process_new_updates([update])
    return '', 200


@app.route('/')
def index():
    return 'Weather Bot is running! ✅', 200


if __name__ == '__main__':
    # Удаляем старый webhook
    bot.remove_webhook()

    # Устанавливаем новый webhook
    webhook_url = f"{os.getenv('RENDER_EXTERNAL_URL')}/{TOKEN}"
    bot.set_webhook(url=webhook_url)
    print(f"Webhook установлен: {webhook_url}")

    # Запускаем Flask
    port = int(os.getenv('PORT', 10000))
    app.run(host='0.0.0.0', port=port)
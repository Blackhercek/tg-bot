import telebot
import os
import requests
from flask import Flask, request
from dotenv import load_dotenv

# Загружаем .env только если файл существует (локально)
if os.path.exists('.env'):
    load_dotenv()

TOKEN = os.getenv("BOT_TOKEN")
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")

# Временная отладка
print(f"DEBUG: BOT_TOKEN = {TOKEN[:20] if TOKEN else 'None'}...")
print(f"DEBUG: WEATHER_API_KEY = {WEATHER_API_KEY[:10] if WEATHER_API_KEY else 'None'}...")

# Если токенов нет - используем дефолтные (только для отладки!)
if not TOKEN:
    TOKEN = "dummy_token_for_testing"
if not WEATHER_API_KEY:
    WEATHER_API_KEY = "dummy_api_key"

bot = telebot.TeleBot(TOKEN)
app = Flask(__name__)

def get_weather():
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

# Webhook endpoint - теперь динамический
@app.route('/webhook', methods=['POST'])
def webhook():
    json_str = request.get_data().decode('UTF-8')
    update = telebot.types.Update.de_json(json_str)
    bot.process_new_updates([update])
    return '', 200

@app.route('/')
def index():
    return 'Weather Bot is running! ✅', 200

@app.route('/set_webhook')
def set_webhook():
    """Ручная установка webhook (для отладки)"""
    webhook_url = f"{os.getenv('RENDER_EXTERNAL_URL')}/webhook"
    bot.set_webhook(url=webhook_url)
    return f'Webhook установлен: {webhook_url}', 200

# Для gunicorn - этот код НЕ выполняется при импорте
if __name__ == '__main__':
    bot.remove_webhook()
    webhook_url = f"{os.getenv('RENDER_EXTERNAL_URL')}/webhook"
    bot.set_webhook(url=webhook_url)
    print(f"✅ Webhook установлен: {webhook_url}")
    
    port = int(os.getenv('PORT', 10000))
    app.run(host='0.0.0.0', port=port)

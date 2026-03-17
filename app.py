from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
import concurrent.futures
from dotenv import load_dotenv

# Cargar variables de entorno del archivo .env
load_dotenv()

# Importar tus módulos locales
# Asegúrate de que estos archivos existan en la misma carpeta
from knowledge_base import get_fixed_response
from ai_clients import call_openai, call_gemini

app = Flask(__name__)
CORS(app)

SYSTEM_PROMPT = (
    "Eres CaldAsistente, un guía turístico virtual especializado EXCLUSIVAMENTE en el departamento de Caldas sin salirse a otros municipios que no pertenezcan al departamento de Caldas, Colombia.\n"
    "Tu conocimiento abarca municipios, el Paisaje Cultural Cafetero, ecoturismo (Nevado del Ruiz), termales de Manizales, cultura y festivales, gastronomía y logística local, Rio la miel en Norcia, patrimonio cultural en Manizales, Salamina, fiestas en Marulanda, aviturismo, parapente en San jose, Bistar el cristo de Belalcazar, entre otras solo del departamento de Caldas.\n"
    "REGLAS: Responde solo sobre turismo en Caldas, redirige si preguntan fuera del tema, sé corto y amable, usa listas cuando ayude."
)

@app.route('/', methods=['GET'])
def index():
    """Sirve la interfaz visual del usuario"""
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    """Procesa los mensajes y compite entre OpenAI y Gemini"""
    data = request.get_json() or {}
    message = data.get('message', '').strip()
    
    if not message:
        return jsonify({'error': 'mensaje vacio'}), 400

    print(f"\n--- 📩 Nueva consulta: {message} ---")

    # CAPA 1: Knowledge Base (Respuestas rápidas sin gastar API)
    fixed = get_fixed_response(message)
    if fixed:
        print("💡 Respuesta servida desde Knowledge Base")
        return jsonify({'source': 'knowledge_base', 'response': fixed})

    # CAPA 2: Carrera de IAs (Race Condition)
    # Subimos el timeout a 10 segundos para evitar errores 504 en conexiones lentas
    timeout = float(os.getenv('RACE_TIMEOUT', '20'))
    last_err = "No se recibió respuesta de ninguna IA configurada."
    
    # Usamos ThreadPoolExecutor para llamar a ambas APIs al mismo tiempo
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
        futures = {
            ex.submit(call_openai, message, SYSTEM_PROMPT): 'OpenAI',
            ex.submit(call_gemini, message, SYSTEM_PROMPT): 'Gemini'
        }
        
        try:
            # as_completed entrega los resultados apenas una termine
            for fut in concurrent.futures.as_completed(futures, timeout=timeout):
                provider = futures[fut]
                try:
                    resp = fut.result()
                    if resp:
                        print(f"✅ Ganador de la carrera: {provider}")
                        return jsonify({'source': provider.lower(), 'response': resp})
                except Exception as e:
                    # Esto imprimirá el error real (Key inválida, falta de saldo, etc.)
                    print(f"❌ Error en {provider}: {str(e)}")
                    last_err = f"Error en {provider}: {str(e)}"
            
            # Si ninguna respondió con éxito
            return jsonify({'error': 'no_response', 'detail': last_err}), 502

        except concurrent.futures.TimeoutError:
            print("⏳ Error: Ambas IAs excedieron el tiempo de espera.")
            return jsonify({'error': 'timeout', 'message': 'Lo siento, las montañas de Caldas están un poco nubladas y la conexión tardó demasiado.'}), 504

if __name__ == '__main__':
    # Obtenemos el puerto de las variables de entorno o usamos el 5000 por defecto
    port = int(os.getenv('PORT', 5000))
    
    print("------------------------------------------")
    print(f"🚀 CaldAsistente arrancando en el puerto {port}")
    print(f"📍 Local: http://localhost:{port}")
    print("------------------------------------------")
    
    # debug=True es vital para ver cambios y errores en tiempo real
    app.run(host='0.0.0.0', port=port, debug=True)
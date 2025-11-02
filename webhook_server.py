#!/usr/bin/env python3
"""
GitHub Webhook Receiver for Auto-Deployment
Listens for GitHub webhook events and triggers deployment
"""
from flask import Flask, request, jsonify
import subprocess
import hmac
import hashlib
import os

app = Flask(__name__)

# Configuration - Set in environment variable or change here
WEBHOOK_SECRET = os.getenv('WEBHOOK_SECRET', 'your-secret-key-here')
DEPLOY_SCRIPT = os.getenv('DEPLOY_SCRIPT', '/volume1/docker/nas-player/deploy.sh')

@app.route('/webhook', methods=['POST'])
def github_webhook():
    """Handle GitHub webhook"""
    # Verify signature if secret is set
    if WEBHOOK_SECRET and WEBHOOK_SECRET != 'your-secret-key-here':
        signature = request.headers.get('X-Hub-Signature-256', '')
        if not verify_signature(request.data, signature, WEBHOOK_SECRET):
            return jsonify({'error': 'Invalid signature'}), 401
    
    # Only trigger on push events to main/master branch
    payload = request.json
    if payload and payload.get('ref') in ['refs/heads/main', 'refs/heads/master']:
        print(f"Webhook received: {payload.get('ref')} - Triggering deployment...")
        
        try:
            # Run deployment script
            result = subprocess.run(
                ['bash', DEPLOY_SCRIPT],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                return jsonify({
                    'status': 'success',
                    'message': 'Deployment triggered successfully',
                    'output': result.stdout
                }), 200
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'Deployment failed',
                    'error': result.stderr
                }), 500
        except subprocess.TimeoutExpired:
            return jsonify({'status': 'error', 'message': 'Deployment timeout'}), 500
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)}), 500
    
    return jsonify({'status': 'ignored', 'message': 'Not a main/master branch push'}), 200

def verify_signature(payload_body, signature_header, secret):
    """Verify GitHub webhook signature"""
    if not signature_header:
        return False
    
    hash_object = hmac.new(
        secret.encode('utf-8'),
        msg=payload_body,
        digestmod=hashlib.sha256
    )
    expected_signature = "sha256=" + hash_object.hexdigest()
    
    return hmac.compare_digest(expected_signature, signature_header)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    # Run on different port to avoid conflict with main app
    app.run(host='0.0.0.0', port=1700, debug=False)


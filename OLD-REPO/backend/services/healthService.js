const axios = require('axios');

class HealthService {
  constructor() {
    this.pythonApiUrl = process.env.PYTHON_API_URL || 'http://python-api:8000';
  }

  /**
   * Testira Python API konekciju
   * @returns {Promise<Object>} - Rezultat testa
   */
  async testPythonConnection() {
    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.pythonApiUrl}/docs`, { 
        timeout: 5000,
        headers: {
          'User-Agent': 'FAZI-Health-Check/1.0'
        }
      });
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'running',
        response_time: `${responseTime}ms`,
        status_code: response.status,
        url: this.pythonApiUrl
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        code: error.code,
        url: this.pythonApiUrl
      };
    }
  }

  /**
   * Testira Python API sa stvarnim zahtevom
   * @returns {Promise<Object>} - Rezultat testa
   */
  async testPythonEndpoint() {
    try {
      const startTime = Date.now();
      const response = await axios.post(`${this.pythonApiUrl}/test`, 
        { message: "Health check test" }, 
        { 
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'FAZI-Health-Check/1.0'
          }
        }
      );
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'ok',
        response_time: `${responseTime}ms`,
        status_code: response.status,
        response_data: response.data
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        code: error.code
      };
    }
  }

  /**
   * Testira Node.js servis
   * @returns {Object} - Status Node.js servisa
   */
  getNodeStatus() {
    const memoryUsage = process.memoryUsage();
    return {
      status: 'running',
      port: process.env.PORT || 3000,
      uptime: Math.floor(process.uptime()),
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
      },
      node_version: process.version,
      platform: process.platform
    };
  }

  /**
   * Kompletan health check
   * @returns {Promise<Object>} - Kompletan health status
   */
  async getHealthStatus() {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        nodejs: this.getNodeStatus(),
        python: {
          status: 'unknown',
          url: this.pythonApiUrl
        }
      }
    };

    // Testiraj Python konekciju
    const pythonConnection = await this.testPythonConnection();
    health.services.python = { ...health.services.python, ...pythonConnection };

    // Testiraj Python endpoint
    const pythonEndpoint = await this.testPythonEndpoint();
    health.services.python.test_endpoint = pythonEndpoint;

    // Odredi overall status
    if (health.services.python.status === 'error' || health.services.python.test_endpoint.status === 'error') {
      health.status = 'degraded';
    }

    return health;
  }
}

module.exports = new HealthService();

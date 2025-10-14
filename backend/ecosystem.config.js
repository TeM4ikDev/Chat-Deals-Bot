module.exports = {
    apps: [
        {
            name: 'telegram-bot',
            script: 'dist/main.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            error_file: './logs/err.log',
            out_file: './logs/out.log',
            log_file: './logs/combined.log',
            time: true,

            env_development: {
                NODE_ENV: 'development',
                APP_URL: 'https://rnxsk3jf-3000.euw.devtunnels.ms/',
            },

            env_production: {
                NODE_ENV: 'production',
                APP_URL: 'https://webky.ru/',
            },
        },
    ],
};

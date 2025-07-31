module.exports = {
    apps: [
        {
            name: 'tonnel-checker',
            script: 'dist/main.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',

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

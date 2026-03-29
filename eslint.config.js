export default [
    {
        files: ["src/**/*.js", "test/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                window: true, document: true, console: true,
                cockpit: true, React: true, ReactDOM: true, Chart: true,
                setTimeout: true, clearTimeout: true, fetch: true,
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error",
            "semi": ["warn", "always"],
        }
    }
];

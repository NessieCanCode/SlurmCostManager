const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/slurmcostmanager.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'slurmcostmanager.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  mode: 'production',
  optimization: {
    splitChunks: false,
    runtimeChunk: false,
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
  ],
};

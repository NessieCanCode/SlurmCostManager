const path = require('path');
const webpack = require('webpack');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  entry: './src/slurmcostmanager.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'slurmcostmanager.js',
  },
  module: {
    rules: [
      {
        test: /bootstrap\.bundle\.min\.js$/,
        type: 'asset/resource',
        generator: { filename: 'bootstrap.bundle.min.js' },
      },
      {
        test: /bootstrap\.min\.css$/,
        type: 'asset/resource',
        generator: { filename: 'bootstrap.min.css' },
      },
      {
        test: /slurmcostmanager\.css$/,
        type: 'asset/resource',
        generator: { filename: 'slurmcostmanager.css' },
      },
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
    minimize: true,
    minimizer: ['...', new CssMinimizerPlugin({ exclude: /bootstrap\.min\.css|slurmcostmanager\.css/ })],
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
  ],
};

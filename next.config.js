const withCSS = require('@zeit/next-css');

module.exports = withCSS({
  webpack: (config, { isServer }) => {
    const FilterWarningsPlugin = require('webpack-filter-warnings-plugin');
    const AntdDayjsWebpackPlugin = require('antd-dayjs-webpack-plugin');
    if (isServer) {
      const antStyles = /antd\/.*?\/style.*?/;
      const origExternals = [...config.externals];
      config.externals = [
        (context, request, callback) => {
          if (request.match(antStyles)) return callback();
          if (typeof origExternals[0] === 'function') {
            origExternals[0](context, request, callback);
          } else {
            callback();
          }
        },
        ...(typeof origExternals[0] === 'function' ? [] : origExternals),
      ];

      config.module.rules.unshift({
        test: antStyles,
        use: 'null-loader',
      });
    }
    config.plugins.push(new AntdDayjsWebpackPlugin());
    config.plugins.push(
      new FilterWarningsPlugin({
        exclude: /extract-css-chunks-plugin[^]*Conflicting order between:/,
      }),
    );
    return config;
  },
});

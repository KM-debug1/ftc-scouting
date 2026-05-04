const pluginConfig: Cypress.PluginConfig = (on, config) => {
  on('task', {
    'clear:downloads': () => {
      return null;
    },
  });

  return config;
};

export default pluginConfig;

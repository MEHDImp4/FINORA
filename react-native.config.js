module.exports = {
  dependencies: {
    'react-native-background-actions': {
      platforms: {
        android: {
          sourceDir: './node_modules/react-native-background-actions/android',
          packageImportPath: 'import com.asterinet.react.bgactions.BackgroundActionsPackage;',
          packageInstance: 'new BackgroundActionsPackage()'
        }
      }
    }
  }
};

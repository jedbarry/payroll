# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Renaming the App

To rename the installed app (home screen label), two files must be updated — `app.json` alone is not enough because this is a bare workflow project with committed native files:

1. **`app.json`** — update `expo.name` and `expo.ios.infoPlist.CFBundleDisplayName`
2. **`ios/payroll/Info.plist`** — update the `CFBundleDisplayName` string directly (this is what iOS actually reads)

After editing both, run `npx expo run:ios --device` to rebuild and reinstall.

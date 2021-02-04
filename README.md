<a  href="https://www.twilio.com">
<img  src="https://static0.twilio.com/marketing/bundles/marketing/img/logos/wordmark-red.svg"  alt="Twilio"  width="250"  />
</a>
 
# Queued Callbacks and Voicemail for Flex

The Queued Callback and Voicemail for Flex plugin helps Flex admins automate handling of agent callback requests from customers instead of having them wait longer in a queue.

## Set up

### Requirements

To deploy this plugin, you will need:
- An active Twilio account with Flex provisioned. Refer to the [Flex Quickstart](https://www.twilio.com/docs/flex/quickstart/flex-basics#sign-up-for-or-sign-in-to-twilio-and-create-a-new-flex-project) to create one.
- npm version 5.0.0 or later installed (type `npm -v` in your terminal to check)
- Node version 10.12.0 or later installed (type `node -v` in your terminal to check)
- [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart#install-twilio-cli) along with the [Flex CLI Plugin](https://www.twilio.com/docs/twilio-cli/plugins#available-plugins) and the [Serverless Plugin](https://www.twilio.com/docs/twilio-cli/plugins#available-plugins). Run the following commands to install them:
   ```
   # Install the Twilio CLI
   npm install twilio-cli -g
   # Install the Serverless and Flex as Plugins
   twilio plugins:install @twilio-labs/plugin-serverless
   twilio plugins:install @twilio-labs/plugin-flex@beta
- A GitHub account
- [Native Dialpad configured on your Flex instance](https://www.twilio.com/docs/flex/dialpad/enable)

### Twilio Account Settings

Before we begin, we need to collect
all the config values we need to run the application:

| Config&nbsp;Value | Description                                                                                                                                                  |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account&nbsp;Sid  | Your primary Twilio account identifier - find this [in the Console](https://www.twilio.com/console).                                                         |
| Serverless Deployment Domain | The resulting Serverless domain name after deploying your Twilio Functions |
| Workspace SID | Your Flex Task Assignment workspace SID - find this [in the Console TaskRouter Workspaces page](https://www.twilio.com/console/taskrouter/workspaces)

### Local development

After the above requirements have been met:

1. Clone this repository

```
git clone git@github.com:twilio-labs/plugin-queued-callbacks-and-voicemail.git
```

2. Change into the `public` subdirectory of the repo and run the following:

```
cd plugin-queued-callbacks-and-voicemail/public && mv appConfig.example.js appConfig.js
```

3. Install dependencies

```bash
npm install
```

4. [Deploy your Twilio Functions and Assets](#twilio-serverless-deployment)

5. Run the application

```bash
twilio flex:plugins:start
```

6. Navigate to [http://localhost:3000](http://localhost:3000)

That's it!

### Twilio Serverless deployment

You need to deploy the functions associated with the Callback and Voicemail Flex plugin to your Flex instance. The functions are called from the plugin you will deploy in the next step and integrate with TaskRouter, passing in required attributes to generate the callback and voicemail tasks, depending on the customer selection while listening to the in-queue menu options.

#### Pre-deployment Steps

Step 1: From the root directory of your copy of the source code, change into `public/resources` and rename `.env.example` to `.env`.

```
cd public/resources && mv .env.example .env
```

Step 2: Open `.env` with your text editor and modify TWILIO_WORKSPACE_SID with your Flex Task Assignment SID.

```
TWILIO_WORKSPACE_SID=WSxxxxxxxxxxxxxxxxxxxxxx`
```

To deploy your Callback and Voicemail functions and assets, run the following:

```
resources $ twilio serverless:deploy --assets

# Example Output
Deploying functions & assets to the Twilio Runtime
Env Variables
⠇ Creating 4 Functions
✔ Serverless project successfully deployed

Deployment Details
Domain: plugin-queued-callbacks-voicemail-functions-2075-dev.twil.io
Service:
  plugin-queued-callbacks-voicemail-functions 
Functions:
  https://plugin-queued-callbacks-voicemail-functions-2075-dev.twil.io/inqueue-callback
  https://plugin-queued-callbacks-voicemail-functions-2075-dev.twil.io/inqueue-utils  
  https://plugin-queued-callbacks-voicemail-functions-2075-dev.twil.io/queue-menu
  https://plugin-queued-callbacks-voicemail-functions-2075-dev.twil.io/inqueue-voicemail

Assets:
  https://plugin-queued-callbacks-voicemail-functions-2075-dev.twil.io/assets/alertTone.mp3
  https://plugin-queued-callbacks-voicemail-functions-2075-dev.twil.io/assets/guitar_music.mp3
```

Copy and save the domain returned when you deploy a function. You will need it in the next step. 

If you forget to copy the domain, you can also find it by navigating to [Functions > API](https://www.twilio.com/console/functions/api) in the Twilio Console.

> Debugging Tip: Pass the -l or logging flag to review deployment logs. For example, you can pass `-l debug` to turn on debugging logs.

### Deploy your Flex Plugin 

Once you have deployed the function, it is time to deploy the plugin to your Flex instance.

Run the following commands in the plugin root directory. We will leverage the Twilio CLI to build and deploy the Plugin.

- Rename `.env.example` to `.env`.
- Open `.env` with your text editor and modify the `REACT_APP_SERVICE_BASE_URL` property to the Domain name you copied in the previous step. Make sure to prefix it with "https://".

```
plugin-queued-callbacks-and-voicemail $ mv .env.example .env

# .env
REACT_APP_SERVICE_BASE_URL=https://plugin-queued-callbacks-voicemail-functions-4135-dev.twil.io
```

When you are ready to deploy the plugin, run the following in a command shell:

```
plugin-queued-callbacks-and-voicemail $ twilio flex:plugins:deploy --major --changelog "Updating to use the latest Twilio CLI Flex plugin" --description "Queued callbacks and voicemail"
``` 

To enable the plugin on your contact center, follow the suggested next step on the deployment confirmation. To enable it via the Flex UI, see the [Plugins Dashboard documentation](https://www.twilio.com/docs/flex/developer/plugins/dashboard#stage-plugin-changes).


## License

[MIT](http://www.opensource.org/licenses/mit-license.html)

## Disclaimer

No warranty expressed or implied. Software is as is.

[twilio]: https://www.twilio.com

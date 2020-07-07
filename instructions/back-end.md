# Setting Up the Backend

Alexa can understand intents and identify slot values, but it doesn’t know exactly what to do with them. The business logic's source code can be edited and hosted under the "code" area of the Alexa developer console.

Copy and paste the source code into the [lambda/custom](./lambda/custom) folder. You can add and delete folders and files as needed. The final skill code should look like this:

```
Skill Code
  lambda
    index.js
    package.json
    languages
      EN_en.js
```

## Update API Credentials

For the skill to work, you will need to get your own credentials for the following APIs:

- [what3words](https://developer.what3words.com/public-api)
- [Uber](https://developer.uber.com)

Use your credentials to update the Skill:

```javascript
// what3words API key
const w3w_apiKey = "#####";

// Uber API credentials
const uber_url = "https://sandbox-api.uber.com/v1.2/";
const server_token = "#####";
const name = "###";
```

The Skill is using the [autosuggest](https://docs.what3words.com/api/v3/#autosuggest) endpoint of the what3words API in order to:

- validate the accuracy of the requested three words address
- retrieve the additional location information of "nearestPlace".

[Next: Setting Up Account Linking](./account_linking.md)

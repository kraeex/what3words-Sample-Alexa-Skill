# Learn How to Integrate what3words with the Uber API into your Alexa Skills

<img src="./images/w3w.jpg" />

## What You Will Need

- [A what3words API key](https://what3words.com/developers/)
- [Amazon Developer Portal Account](http://developer.amazon.com)
- The sample code on [GitHub]().
- A basic understanding of Node.js.

## What Your Skill Will Do

The "3 Word Go" Skill will teach you how to integrate what3words with the Uber API in order to develop an Amazon Alexa skill. An example flow that can be achieved with the skill is as follows:

User: Alexa, ask Three Word Go to order me an Uber from index home raft to filled count soap.
Alexa: OK, I found index home raft near Bayswater and filled count soap near Bayswater. Should I get an estimate from Uber?
User: Yes.
Alexa: Your Uber x to filled count soap is 5 minutes away. Would you like to confirm the order?
User: Yes.
Alexa: Thank you! Your UberX is on its way! Please check your Uber app for updates.

## Skill Architecture

Each skill consists of two basic parts, a front end and a back end.

1. The front end is the voice user interface, or VUI. The VUI is configured through the voice interaction model. [Alexa Skills Kit](https://developer.amazon.com/alexa/console/ask)
2. The back end is where the logic of your skill resides. The instructions will describe an [Alexa-hosted skill](https://developer.amazon.com/en-US/docs/alexa/hosted-skills/build-a-skill-end-to-end-using-an-alexa-hosted-skill.html), but you can deploy the same code on your own back end environment, e.g. [Lambda functions at AWS](https://aws.amazon.com/lambda/)

[Next: Create the voice user interface](./create-vui.md)

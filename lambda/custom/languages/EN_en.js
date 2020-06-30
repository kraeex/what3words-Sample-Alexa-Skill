module.exports = {
  translation: {
    LANGUAGE: "en",
    Enable_Location:
      "Please enable location services. I’ve sent a card to your Alexa App to help with this.",
    Enable_Address:
      "Please enable device address. I’ve sent a card to your Alexa App to help with this.",
    actionOption: "Do you want to order an Uber or exit the skill?",
    Goodbye: "Ok, see you next time. Goodbye!",
    UberComing: `Thank you! Your uber is %s! Please check your Uber app for updates.`,
    toPlace: ` to %s `,
    problemStatus:
      "Sorry I had problem checking the status of your Uber ride. Please try again or check your Uber app for updates.",
    problemStatusCheck:
      "Sorry I had problem connecting with your Uber account. Please check your uber app for possible updates or try again.",
    problemUberStatusCheck:
      "Sorry I had problem checking your Uber ride. Please try again.",
    titleUber: `%s to %s`,
    orderCard: `Your %s %s is %s minutes away.`,
    orderConfirm: "Do you want to confirm the order?",
    SKILL_NAME: "Three Word Go",
    HELP_MESSAGE:
      " I can help you order an uber to a three word address! You can try: 'alexa, ask Three Word Go to order me an uber'",
    HELP_REPROMPT:
      "You can ask me to order you an uber to a three word address",
    STOP_MESSAGE: "Goodbye!",
    WELCOME_MESSAGE:
      "Welcome to Three Word Go! You can ask me to get you an uber to a three word address. You can say 'order me an Uber'",
    WELCOME_REPROMPT:
      "You can ask me to order you an uber to a three word address",
    NOTIFY_MISSING_PERMISSIONS:
      "Please enable device address. I’ve sent a card to your Alexa App to help with this",
    ERROR: "Sorry it looks like something went wrong.",
    LOCATION_FAILURE:
      "There was an error with the Device Address. Please try again.",
    UNHANDLED:
      "Sorry, I didn't get that. You can try: alexa, ask Three Word Go to order me an uber.",
    PERMISSIONS: ["read::alexa:device:all:address"],
    HAVE_UBER_ACCOUNT:
      "You must have an Uber account to order a ride. Please use the Alexa app to link your Uber Account.",
    NO_W3W_CONNECTION:
      "Sorry it looks like something went wrong. Please try again later.",
    NO_DESTINATION:
      "Sorry, I didn't hear your destination. Please try again. Do you want to order an Uber or exit the skill?",
    NO_W3W_ADDRESS: " I couldn’t find your address. Please try again.",
    NO_NEARBY_UBER:
      "Uber is unable to provide this journey. Please check that this journey is possible in the Uber mobile app",
    UBER_CONNECTION_ERROR:
      "Sorry I had a problem connecting with your Uber account. Please try again.",
    UBER_CANCELLATION: "You can cancel your ride in the Uber app",
    NO_COMPLETE_ADDRESS:
      "It looks like you haven't setup your device address. You can set it up on the Alexa app.",
    SURGED_PRICE: `It is busy out there! Surge pricing is currently in effect for this trip. Unfortunately you cannot complete the order on Alexa. Please use your Uber app.`,
    NO_DRIVERS_AVAILABLE:
      "Sorry! There are no drivers available. Please try again later.",
    EXISTING_TRIP: "Sorry you have an existing active trip.",
    NOT_AVAILABLE: "This is not available at the moment.",
    HALF_W3W_GETPLACE:
      "I must have made a mistake. Please try again. Do you want to find where a three word address is or exit the skill?",
    I_HEARD: "Sorry, I heard",
    noGPS:
      "Sorry, I am having trouble accessing your GPS location. Please go to your device's settings to turn on location sharing, and try again",
    noCoordinates:
      "Sorry, I am having difficulty finding the coordinates of your pick up three word address.",
    noDestination:
      "Sorry, I cannot find your destination. Please make sure that the three word address of your destination is correct and try again. Do you want to order an Uber or exit the skill?",
    plsOrig: ` near %s `,
    findAddress: `OK, I found %s %s %s %s and %s %s %s %s. Should I get an estimate from Uber?`,
    noThreeWordAddress:
      "Sorry, I am having difficulty finding your three word address.",
    noPickupLong:
      "Sorry, I cannot find your pick up three word address. Please make sure that the pickup three word address is correct and try again. Do you want to order an Uber or exit the skill?",
    pickupOptions: `Do you want a pick up from your device's current GPS location or a three word address?`,
    lowAccuracy: `Your GPS accuracy is more than %s. What three word address would you like to be picked up from?`,
    noLocation:
      "Sorry, I am having difficulty finding the location of your three word address.",
    wrongPickup: `Sorry, I heard that you need a pick up from %s. Please try again. Do you want to order an Uber or exit the skill?`,
    gpsOff: `GPS is currently turned off so I have sent a card to your Alexa app in case you want to turn it on. What three word address would you like to be picked up from?`,
    whatPickup: `What three word address would you like to be picked up from?`,
    whatDestination: `What three word address would you like to go to?`,
    wrongAddress: `Sorry, I heard %s. Please try again. Do you want to order an Uber or exit the skill?`,
    noPickup:
      "Sorry, I am having difficulty finding the location of your pick up three word address.",
    wrongDestination: `Sorry, I heard that you want to go to %s. Please try again. Do you want to order an Uber or exit the skill?`,
    wherePickup: `Where do you want a pickup from?`,
    orderDistance: `Your %s to %s %s %s %s is %s minutes away. Would you like to confirm the order?`,
    not_found: `Sorry, I Couldn't find an available %s`,
    no_product_found: `Sorry, I Couldn't find an available %s`,
    distance_exceeded:
      "Sorry. Distance between start and end location exceeds 100 miles.",
    same_pickup_dropoff: "Sorry, Pickup and Dropoff can't be the same.",
    defaultError:
      "Sorry I had problem connecting with your Uber account. Please try again later.",
    samePickupDropoff:
      "Sorry, Pickup and Dropoff can't be the same. Please try again. Do you want to order an Uber or exit the skill?",
    orderStatus: `Your Uber request to %s %s %s is %s. Please check your Uber app for updates.`,
    orderProgress:
      "Your order has not been placed or it hasn't been processed yet. You can check your Uber app for updates. Do you want to check the status of your ride or exit the skill?",
    cancelUber: `Your Uber request to %s %s %s is %s. Do you want to cancel your ride or exit the skill?`,
    noActiveRide:
      "You do not have an active Uber request. Do you want to order an Uber or exit the skill?",
    rideCanceled: `Your ride to %s %s %s has been cancelled. Goodbye!`,
    speechOutput:
      "Sorry, I cannot find details about %s. Please, make sure that the three word address is correct and try again."
  }
};

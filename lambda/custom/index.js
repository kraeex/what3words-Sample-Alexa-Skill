"use strict";

const Alexa = require("ask-sdk-core");
const request = require("request");
const rp = require("request-promise");
const Geocoder = require("w3w-node-wrapper");
const i18n = require("i18next");
const sprintf = require("i18next-sprintf-postprocessor");
const uuidv4 = require("uuid/v4");

const credentials = require("./credentials.js");

const uber_url = "https://sandbox-api.uber.com/v1.2/";
const w3w_apiKey = credentials.credentials.w3w_apiKey;
const client_id = credentials.credentials.client_id;
const client_secret = credentials.credentials.client_secret;
const server_token = credentials.credentials.server_token;
const redirect_uri = credentials.credentials.redirect_uri;
const name = credentials.credentials.name;
const google_maps = credentials.credentials.google_maps;
const w3wUrl = "https://api.what3words.com/v3";

const w3woptions = {
  apiKey: w3w_apiKey
};

const w3w = new Geocoder(w3woptions);

const languageStrings = {
  "en-GB": require("./languages/EN_en.js")
};

const rideStatus = [
  "processing",
  "no_drivers_available",
  "accepted",
  "arriving",
  "in_progress",
  "driver_canceled",
  "rider_canceled",
  "completed"
];

// LAUNCH HANDLER
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "LaunchRequest";
  },
  handle(handlerInput) {
    console.log("IN ", handlerInput.requestEnvelope.request.type.toUpperCase());
    var accessToken =
      handlerInput.requestEnvelope.context.System.user.accessToken;
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    let speechOutput = requestAttributes.t("WELCOME_MESSAGE");
    // Use the token to access the user's profile.
    // This should also verify that the token represents a valid Uber user.
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(speechOutput)
      .getResponse();
  }
};

const InProgressGetTaxiHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "GetTaxi" &&
      handlerInput.requestEnvelope.request.dialogState !== "COMPLETED"
    );
  },
  handle(handlerInput) {
    console.log(
      "IN ",
      handlerInput.requestEnvelope.request.intent.name.toUpperCase(),
      handlerInput.requestEnvelope.request.dialogState
    );
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    var accessToken =
      handlerInput.requestEnvelope.context.System.user.accessToken;
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    if (accessToken == undefined) {
      let speechOutput = requestAttributes.t("HAVE_UBER_ACCOUNT");
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withLinkAccountCard()
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .addDelegateDirective(currentIntent)
        .getResponse();
    }
  }
};

const CompletedGetTaxiHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "GetTaxi" &&
      handlerInput.requestEnvelope.request.dialogState === "COMPLETED"
    );
  },
  async handle(handlerInput) {
    console.log(
      "IN ",
      handlerInput.requestEnvelope.request.intent.name.toUpperCase(),
      handlerInput.requestEnvelope.request.dialogState
    );
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
    const slotValues = getSlotValues(filledSlots);
    console.log("slots:", JSON.stringify(slotValues));
    let whatThreewordDest = slotValues.whatThreewordDest.synonym;
    let whatThreewordOrigin = slotValues.whatThreewordOrigin.synonym;
    var whatThreewordDestlength = whatThreewordDest.split(" ").length;
    const {
      requestEnvelope,
      serviceClientFactory,
      responseBuilder
    } = handlerInput;
    const consentToken =
      requestEnvelope.context.System.user.permissions &&
      requestEnvelope.context.System.user.permissions.consentToken;

    const isGeoSupported =
      requestEnvelope.context.System.device.supportedInterfaces.Geolocation;
    const geoObject = requestEnvelope.context.Geolocation;
    var ACCURACY_THRESHOLD = 10; // accuracy of 10 meters required
    var skillPermissionGranted =
      requestEnvelope.context.System.user.permissions.scopes[
        "alexa::devices:all:geolocation:read"
      ].status === "GRANTED";

    if (whatThreewordDestlength == 3) {
      if (isGeoSupported && geoObject && geoObject.coordinate) {
        if (skillPermissionGranted) {
          console.log("geolocation permission granted");
          if (
            typeof geoObject.locationServices !== "undefined" &&
            (geoObject.locationServices.status === "STOPPED" ||
              geoObject.locationServices.access === "DISABLED")
          ) {
            let speechOutput = requestAttributes.t("noGPS");
            return handlerInput.responseBuilder
              .speak(speechOutput)
              .withShouldEndSession(true)
              .getResponse();
          } else {
            let latStart = geoObject.coordinate.latitudeInDegrees;
            let lngStart = geoObject.coordinate.longitudeInDegrees;
            let addr = "your current mobile location";
            if (whatThreewordOrigin) {
              var whatThreewordOriginlength = whatThreewordOrigin.split(" ")
                .length;
              if (whatThreewordOriginlength == 3) {
                // VALIDATE three word addresses
                let what3wordOrigin = encodeURI(whatThreewordOrigin);
                let what3wordsDest = encodeURI(whatThreewordDest);

                let latStartSuggestions;
                let lngStartSuggestions;
                let latDestinationSuggestions;
                let lonDestinationSuggestions;
                let destinationWords;
                let originWords;
                let originPlace;

                return new Promise((resolve, reject) => {
                  let options = {
                    method: "GET",
                    url: `${w3wUrl}/autosuggest?input=${what3wordOrigin}&input-type=generic-voice&key=${w3w_apiKey}&language=en`,
                    headers: {}
                  };

                  getRequest(options)
                    .then(response => {
                      var originSuggestions = JSON.parse(response);
                      console.log(originSuggestions.suggestions[0]);
                      if (
                        typeof originSuggestions.suggestions[0] == "undefined"
                      ) {
                        console.log("cannot find pickup w3w");
                        var speechOutput = requestAttributes.t(
                          "speechOutput",
                          threeWords
                        );
                        resolve(
                          handlerInput.responseBuilder
                            .speak(speechOutput)
                            .getResponse()
                        );
                      } else {
                        originWords = originSuggestions.suggestions[0].words;
                        originPlace = originSuggestions.suggestions[0].nearestPlace.split(
                          ","
                        );
                        let originToCoordinatesOptions = {
                          method: "GET",
                          url: `${w3wUrl}/convert-to-coordinates?words=${originWords}&key=${w3w_apiKey}`,
                          headers: {}
                        };
                        getRequest(originToCoordinatesOptions)
                          .then(response => {
                            var originToCoordinates = JSON.parse(response);
                            if (
                              typeof originToCoordinates.coordinates !=
                              "undefined"
                            ) {
                              latStartSuggestions =
                                originToCoordinates.coordinates.lat;
                              lngStartSuggestions =
                                originToCoordinates.coordinates.lng;
                              let destinationQuery = {
                                method: "GET",
                                url: `${w3wUrl}/autosuggest?input=${what3wordsDest}&input-type=generic-voice&key=${w3w_apiKey}&language=en`,
                                headers: {}
                              };
                              console.log("destinationQuery", destinationQuery);

                              getRequest(destinationQuery)
                                .then(response => {
                                  var destinationSuggestions = JSON.parse(
                                    response
                                  );
                                  console.log(
                                    destinationSuggestions.suggestions[0]
                                  );
                                  if (
                                    typeof destinationSuggestions
                                      .suggestions[0] == "undefined"
                                  ) {
                                    console.log("cannot find destination w3w");
                                    var speechOutput = requestAttributes.t(
                                      "noDestination"
                                    );
                                    resolve(
                                      handlerInput.responseBuilder
                                        .speak(speechOutput)
                                        .reprompt(speechOutput)
                                        .getResponse()
                                    );
                                  } else {
                                    destinationWords =
                                      destinationSuggestions.suggestions[0]
                                        .words;
                                    let pls = destinationSuggestions.suggestions[0].nearestPlace.split(
                                      ","
                                    );
                                    let destinationToCoordinatesOptions = {
                                      method: "GET",
                                      url: `${w3wUrl}/convert-to-coordinates?words=${destinationWords}&key=${w3w_apiKey}`,
                                      headers: {}
                                    };
                                    getRequest(destinationToCoordinatesOptions)
                                      .then(response => {
                                        var destinationToCoordinates = JSON.parse(
                                          response
                                        );
                                        if (
                                          typeof destinationToCoordinates.coordinates !=
                                          "undefined"
                                        ) {
                                          latDestinationSuggestions =
                                            destinationToCoordinates.coordinates
                                              .lat;
                                          lonDestinationSuggestions =
                                            destinationToCoordinates.coordinates
                                              .lng;
                                          let order = {
                                            originWords: originWords,
                                            destinationWords: destinationWords,
                                            latStart: latStartSuggestions,
                                            lngStart: lngStartSuggestions,
                                            latDestination: latDestinationSuggestions,
                                            lonDestination: lonDestinationSuggestions,
                                            place: pls[0],
                                            originSpoken: what3wordOrigin,
                                            destinationSpoken: what3wordsDest,
                                            originPlace: originPlace[0],
                                            confirmedAddress: true
                                          };

                                          handlerInput.attributesManager.setSessionAttributes(
                                            order
                                          );
                                          destinationWords = destinationWords.split(
                                            "."
                                          );
                                          originWords = originWords.split(".");
                                          let plsDest;
                                          let plsOrig;
                                          if (pls[0] !== "") {
                                            plsDest = ` near ${pls[0]}, `;
                                          } else {
                                            plsDest = ` `;
                                          }
                                          if (originPlace[0] !== "") {
                                            plsOrig = ` near ${
                                              originPlace[0]
                                            } `;
                                          } else {
                                            plsOrig = ` `;
                                          }
                                          var speechOutput = requestAttributes.t(
                                            "noDestination",
                                            destinationWords[0],
                                            destinationWords[1],
                                            destinationWords[2],
                                            plsDest,
                                            originWords[0],
                                            originWords[1],
                                            originWords[2],
                                            plsOrig
                                          );

                                          resolve(
                                            handlerInput.responseBuilder
                                              .speak(speechOutput)
                                              .reprompt(speechOutput)
                                              .getResponse()
                                          );
                                        } else {
                                          console.log(
                                            "error at destinationToCoordinates: ",
                                            error
                                          );
                                          var speechOutput = requestAttributes.t(
                                            "noCoordinates"
                                          );
                                          resolve(
                                            handlerInput.responseBuilder
                                              .speak(speechOutput)
                                              .getResponse()
                                          );
                                        }
                                      })
                                      .catch(error => {
                                        console.log(
                                          "error at getw3wSuggestions: ",
                                          error
                                        );
                                        var speechOutput = requestAttributes.t(
                                          "noThreeWordAddress"
                                        );
                                        resolve(
                                          handlerInput.responseBuilder
                                            .speak(speechOutput)
                                            .getResponse()
                                        );
                                      });
                                  }
                                })
                                .catch(error => {
                                  console.log(
                                    "error at getw3wSuggestions: ",
                                    error
                                  );
                                  var speechOutput = requestAttributes.t(
                                    "noThreeWordAddress"
                                  );
                                  resolve(
                                    handlerInput.responseBuilder
                                      .speak(speechOutput)
                                      .getResponse()
                                  );
                                });
                            } else {
                              console.log(
                                "error at destinationToCoordinates: ",
                                error
                              );
                              var speechOutput = requestAttributes.t(
                                "noCoordinates"
                              );
                              resolve(
                                handlerInput.responseBuilder
                                  .speak(speechOutput)
                                  .getResponse()
                              );
                            }
                          })
                          .catch(error => {
                            console.log("error at getw3wSuggestions: ", error);
                            var speechOutput = requestAttributes.t(
                              "NO_W3W_ADDRESS"
                            );
                            resolve(
                              handlerInput.responseBuilder
                                .speak(speechOutput)
                                .getResponse()
                            );
                          });
                      }
                    })
                    .catch(error => {
                      console.log("error at getw3wSuggestionsnofocus: ", error);
                      var speechOutput = requestAttributes.t(
                        "noThreeWordAddress"
                      );
                      resolve(
                        handlerInput.responseBuilder
                          .speak(speechOutput)
                          .getResponse()
                      );
                    });
                });
              } else {
                console.log("NO FULL ORIGIN");
                var speechOutput = requestAttributes.t(
                  "wrongPickup",
                  whatThreewordOrigin
                );
                return handlerInput.responseBuilder
                  .speak(speechOutput)
                  .reprompt(speechOutput)
                  .getResponse();
              }
            } else {
              console.log("NO ORIGIN");
              if (geoObject.coordinate.accuracyInMeters <= ACCURACY_THRESHOLD) {
                let coordinates = {
                  latdevice: latStart,
                  lngdevice: lngStart,
                  deviceAddress: addr,
                  whatThreewordDest: whatThreewordDest,
                  confirmedDestination: true
                };
                console.log("attribute coordinates", coordinates);
                handlerInput.attributesManager.setSessionAttributes(
                  coordinates
                );
                let speechOutput = requestAttributes.t("pickupOptions");
                return handlerInput.responseBuilder
                  .speak(speechOutput)
                  .reprompt(speechOutput)
                  .getResponse();
              } else {
                let coordinates = {
                  latdevice: latStart,
                  lngdevice: lngStart,
                  deviceAddress: addr,
                  whatThreewordDest: whatThreewordDest,
                  confirmedDestination: true
                };
                console.log("low accuracy attribute coordinates", coordinates);
                handlerInput.attributesManager.setSessionAttributes(
                  coordinates
                );

                const { deviceId } = requestEnvelope.context.System.device;
                let userDistanceUnits;
                const upsServiceClient = serviceClientFactory.getUpsServiceClient();
                userDistanceUnits = await upsServiceClient.getSystemDistanceUnits(
                  deviceId
                );
                userDistanceUnits = userDistanceUnits.toLowerCase();
                let distanceUnits;
                if (userDistanceUnits === "imperial") {
                  distanceUnits = "32 feet";
                } else {
                  distanceUnits = "10 meters";
                }

                let speechOutput;
                speechOutput = requestAttributes.t(
                  "lowAccuracy",
                  distanceUnits
                );
                return handlerInput.responseBuilder
                  .speak(speechOutput)
                  .reprompt(speechOutput)
                  .getResponse();
              }
            }
          }
        }
      } else {
        if (!consentToken) {
          console.log("isGeoSupported in consent", isGeoSupported);
          if (isGeoSupported) {
            return handlerInput.responseBuilder
              .speak(requestAttributes.t("Enable_Location"))
              .withAskForPermissionsConsentCard([
                "alexa::devices:all:geolocation:read"
              ])
              .getResponse();
          } else {
            return handlerInput.responseBuilder
              .speak(requestAttributes.t("Enable_Address"))
              .withAskForPermissionsConsentCard([
                "read::alexa:device:all:address"
              ])
              .getResponse();
          }
        }

        try {
          const { deviceId } = requestEnvelope.context.System.device;
          const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();

          const address = await deviceAddressServiceClient.getFullAddress(
            deviceId
          );

          console.log(
            "Address successfully retrieved, now responding to user."
          );

          if (address.addressLine1 === null || address.postalCode === null) {
            console.log("null address");
            return handlerInput.responseBuilder
              .speak(requestAttributes.t("NO_COMPLETE_ADDRESS"))
              .getResponse();
          } else {
            const originAdress = `${address.addressLine1},${address.postalCode}`;
            let latStart;
            let lngStart;
            var geocodeLink = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURI(
              originAdress
            )}&key=${google_maps}`;
            return new Promise((resolve, reject) => {
              rp(geocodeLink)
                .then(function(originCoord) {
                  var originCoord = JSON.parse(originCoord);
                  if (originCoord.results[0] != null) {
                    latStart = originCoord.results[0].geometry.location.lat;
                    lngStart = originCoord.results[0].geometry.location.lng;
                    console.log("coordinates", latStart, lngStart);
                    if (whatThreewordOrigin) {
                      var whatThreewordOriginlength = whatThreewordOrigin.split(
                        " "
                      ).length;
                      if (whatThreewordOriginlength == 3) {
                        let what3wordOrigin = encodeURI(whatThreewordOrigin);
                        let what3wordsDest = encodeURI(whatThreewordDest);
                        console.log(what3wordOrigin, what3wordsDest);

                        let latStartSuggestions;
                        let lngStartSuggestions;
                        let latDestinationSuggestions;
                        let lonDestinationSuggestions;
                        let destinationWords;
                        let originWords;
                        let originPlace;
                        let options = {
                          method: "GET",
                          url: `${w3wUrl}/autosuggest?input=${what3wordOrigin}&input-type=generic-voice&key=${w3w_apiKey}&language=en`,
                          headers: {}
                        };

                        getRequest(options)
                          .then(response => {
                            var originSuggestions = JSON.parse(response);
                            console.log(originSuggestions.suggestions[0]);
                            if (
                              typeof originSuggestions.suggestions[0] ==
                              "undefined"
                            ) {
                              console.log("cannot find pickup w3w");
                              var speechOutput = requestAttributes.t(
                                "noPickupLong"
                              );
                              resolve(
                                handlerInput.responseBuilder
                                  .speak(speechOutput)
                                  .reprompt(speechOutput)
                                  .getResponse()
                              );
                            } else {
                              originWords =
                                originSuggestions.suggestions[0].words;
                              originPlace = originSuggestions.suggestions[0].nearestPlace.split(
                                ","
                              );
                              let originToCoordinatesOptions = {
                                method: "GET",
                                url: `${w3wUrl}/convert-to-coordinates?words=${originWords}&key=${w3w_apiKey}`,
                                headers: {}
                              };
                              getRequest(originToCoordinatesOptions)
                                .then(response => {
                                  var originToCoordinates = JSON.parse(
                                    response
                                  );
                                  if (
                                    typeof originToCoordinates.coordinates !=
                                    "undefined"
                                  ) {
                                    latStartSuggestions =
                                      originToCoordinates.coordinates.lat;
                                    lngStartSuggestions =
                                      originToCoordinates.coordinates.lng;
                                    let destinationQuery = {
                                      method: "GET",
                                      url: `${w3wUrl}/autosuggest?input=${what3wordsDest}&input-type=generic-voice&key=${w3w_apiKey}&language=en`,
                                      headers: {}
                                    };

                                    getRequest(destinationQuery)
                                      .then(response => {
                                        var destinationSuggestions = JSON.parse(
                                          response
                                        );
                                        console.log(
                                          destinationSuggestions.suggestions[0]
                                        );
                                        if (
                                          typeof destinationSuggestions
                                            .suggestions[0] == "undefined"
                                        ) {
                                          console.log(
                                            "cannot find destination w3w"
                                          );
                                          var speechOutput = requestAttributes.t(
                                            "noDestination"
                                          );
                                          resolve(
                                            handlerInput.responseBuilder
                                              .speak(speechOutput)
                                              .reprompt(speechOutput)
                                              .getResponse()
                                          );
                                        } else {
                                          destinationWords =
                                            destinationSuggestions
                                              .suggestions[0].words;
                                          let pls = destinationSuggestions.suggestions[0].nearestPlace.split(
                                            ","
                                          );

                                          let destinationToCoordinatesOptions = {
                                            method: "GET",
                                            url: `${w3wUrl}/convert-to-coordinates?words=${destinationWords}&key=${w3w_apiKey}`,
                                            headers: {}
                                          };
                                          getRequest(
                                            destinationToCoordinatesOptions
                                          )
                                            .then(response => {
                                              var destinationToCoordinates = JSON.parse(
                                                response
                                              );
                                              if (
                                                typeof destinationToCoordinates.coordinates !=
                                                "undefined"
                                              ) {
                                                latDestinationSuggestions =
                                                  destinationToCoordinates
                                                    .coordinates.lat;
                                                lonDestinationSuggestions =
                                                  destinationToCoordinates
                                                    .coordinates.lng;

                                                let order = {
                                                  originWords: originWords,
                                                  destinationWords: destinationWords,
                                                  latStart: latStartSuggestions,
                                                  lngStart: lngStartSuggestions,
                                                  latDestination: latDestinationSuggestions,
                                                  lonDestination: lonDestinationSuggestions,
                                                  place: pls[0],
                                                  originPlace: originPlace[0],
                                                  originSpoken: what3wordOrigin,
                                                  destinationSpoken: what3wordsDest,
                                                  confirmedAddress: true
                                                };

                                                handlerInput.attributesManager.setSessionAttributes(
                                                  order
                                                );
                                                destinationWords = destinationWords.split(
                                                  "."
                                                );
                                                originWords = originWords.split(
                                                  "."
                                                );

                                                let plsDest;
                                                let plsOrig;
                                                if (pls[0] !== "") {
                                                  plsDest = ` near ${pls[0]}, `;
                                                } else {
                                                  plsDest = ` `;
                                                }
                                                if (originPlace[0] !== "") {
                                                  plsOrig = ` near ${
                                                    originPlace[0]
                                                  } `;
                                                } else {
                                                  plsOrig = ` `;
                                                }
                                                var speechOutput = requestAttributes.t(
                                                  "findAddress",
                                                  destinationWords[0],
                                                  destinationWords[1],
                                                  destinationWords[2],
                                                  plsDest,
                                                  originWords[0],
                                                  originWords[1],
                                                  originWords[2],
                                                  plsOrig
                                                );

                                                resolve(
                                                  handlerInput.responseBuilder
                                                    .speak(speechOutput)
                                                    .reprompt(speechOutput)
                                                    .getResponse()
                                                );
                                              } else {
                                                console.log(
                                                  "error at getw3wSuggestions: ",
                                                  error
                                                );
                                                var speechOutput = requestAttributes.t(
                                                  "noLocation"
                                                );
                                                resolve(
                                                  handlerInput.responseBuilder
                                                    .speak(speechOutput)
                                                    .getResponse()
                                                );
                                              }
                                            })
                                            .catch(error => {
                                              console.log(
                                                "error at getw3wSuggestions: ",
                                                error
                                              );
                                              var speechOutput = requestAttributes.t(
                                                "noLocation"
                                              );
                                              resolve(
                                                handlerInput.responseBuilder
                                                  .speak(speechOutput)
                                                  .getResponse()
                                              );
                                            });
                                        }
                                      })
                                      .catch(error => {
                                        console.log(
                                          "error at getw3wSuggestions: ",
                                          error
                                        );
                                        var speechOutput = requestAttributes.t(
                                          "NO_W3W_ADDRESS"
                                        );
                                        resolve(
                                          handlerInput.responseBuilder
                                            .speak(speechOutput)
                                            .getResponse()
                                        );
                                      });
                                  }
                                })
                                .catch(error => {
                                  console.log(
                                    "error at getw3wSuggestionsnofocus: ",
                                    error
                                  );
                                  var speechOutput = requestAttributes.t(
                                    "noThreeWordAddress"
                                  );
                                  resolve(
                                    handlerInput.responseBuilder
                                      .speak(speechOutput)
                                      .getResponse()
                                  );
                                });
                            }
                          })
                          .catch(error => {
                            console.log(
                              "error at getw3wSuggestionsnofocus: ",
                              error
                            );
                            var speechOutput = requestAttributes.t(
                              "NO_W3W_ADDRESS"
                            );
                            resolve(
                              handlerInput.responseBuilder
                                .speak(speechOutput)
                                .getResponse()
                            );
                          });
                      } else {
                        console.log("NO FULL ORIGIN");
                        var speechOutput = requestAttributes.t(
                          "wrongPickup",
                          whatThreewordOrigin
                        );
                        resolve(
                          handlerInput.responseBuilder
                            .speak(speechOutput)
                            .reprompt(speechOutput)
                            .getResponse()
                        );
                      }
                    } else {
                      console.log("NO ORIGIN");
                      let coordinates = {
                        latdevice: latStart,
                        lngdevice: lngStart,
                        deviceAddress: address.addressLine1,
                        whatThreewordDest: whatThreewordDest,
                        confirmedDestination: true
                      };
                      console.log(
                        "low accuracy attribute coordinates",
                        coordinates
                      );
                      handlerInput.attributesManager.setSessionAttributes(
                        coordinates
                      );
                      let speechOutput;
                      if (isGeoSupported) {
                        speechOutput = requestAttributes.t("gpsOff");
                        resolve(
                          handlerInput.responseBuilder
                            .speak(speechOutput)
                            .reprompt(speechOutput)
                            .withAskForPermissionsConsentCard([
                              "alexa::devices:all:geolocation:read"
                            ])
                            .getResponse()
                        );
                      } else {
                        speechOutput = requestAttributes.t("whatPickup");
                        resolve(
                          handlerInput.responseBuilder
                            .speak(speechOutput)
                            .reprompt(speechOutput)
                            .getResponse()
                        );
                      }
                    }
                  } else {
                    console.log("no coordinates");
                  }
                })
                .catch(error => {
                  console.log("error at getw3wSuggestions: ", error);
                  resolve(
                    handlerInput.responseBuilder
                      .speak(requestAttributes.t("NO_W3W_CONNECTION"))
                      .getResponse()
                  );
                });
            });
          }
        } catch (error) {
          if (error.name !== "ServiceError") {
            console.log("error");
            return handlerInput.responseBuilder
              .speak(requestAttributes.t("NO_W3W_CONNECTION"))
              .getResponse();
          }
          throw error;
        }
      }
    } else {
      if (whatThreewordDest) {
        console.log("NO FULL DESTINATION");
        var speechOutput = requestAttributes.t("whatDestination");
        const updatedSlot = {
          name: "GetTaxi",
          confirmationStatus: "NONE",
          slots: {
            whatThreewordDest: {
              name: "whatThreewordDest"
            },
            whatThreewordOrigin: {
              name: "whatThreewordOrigin"
            }
          }
        };
        return handlerInput.responseBuilder
          .addElicitSlotDirective("whatThreewordDest", updatedSlot)
          .speak(speechOutput)
          .getResponse();
      } else {
        console.log("NO DESTINATION");
        var speechOutput = requestAttributes.t("NO_DESTINATION");
        return handlerInput.responseBuilder
          .speak(speechOutput)
          .reprompt(speechOutput)
          .getResponse();
      }
    }
  }
};

// TAXI INTENT with collected slot inputs
const GetTaxiFromDeviceIntentHandler = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name ===
        "GetTaxiFromDeviceIntent" &&
      handlerInput.attributesManager.getSessionAttributes()
        .confirmedDestination == true
    );
  },
  async handle(handlerInput) {
    console.log(
      "IN " + handlerInput.requestEnvelope.request.intent.name.toUpperCase()
    );
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    //check if account is linked
    var accessToken =
      handlerInput.requestEnvelope.context.System.user.accessToken;
    if (accessToken == undefined) {
      const currentIntent = handlerInput.requestEnvelope.request.intent;
      let speechOutput = requestAttributes.t("HAVE_UBER_ACCOUNT");
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withLinkAccountCard()
        .getResponse();
    } else {
      //  Get slot value
      const attributes = handlerInput.attributesManager.getSessionAttributes();
      let whatThreewordDest = attributes.whatThreewordDest;
      let destLength = whatThreewordDest.split(" ").length;
      let what3wordsDest = encodeURI(whatThreewordDest);
      console.log("destination w3w", what3wordsDest);

      let latDestination;
      let lonDestination;
      let destinationWords;
      let originWords;

      if (destLength == 3) {
        return new Promise((resolve, reject) => {
          let destinationQuery = {
            method: "GET",
            url: `${w3wUrl}/autosuggest?input=${what3wordsDest}&input-type=generic-voice&key=${w3w_apiKey}&language=en`,
            headers: {}
          };
          console.log("destinationQuery", destinationQuery);

          getRequest(destinationQuery)
            .then(response => {
              var destinationSuggestions = JSON.parse(response);
              console.log(destinationSuggestions.suggestions[0]);
              if (typeof destinationSuggestions.suggestions[0] == "undefined") {
                console.log("cannot find destination w3w");
                var speechOutput = requestAttributes.t("noDestination");
                resolve(
                  handlerInput.responseBuilder
                    .speak(speechOutput)
                    .reprompt(speechOutput)
                    .getResponse()
                );
              } else {
                destinationWords = destinationSuggestions.suggestions[0].words;
                let pls = destinationSuggestions.suggestions[0].nearestPlace.split(
                  ","
                );

                let destinationToCoordinatesOptions = {
                  method: "GET",
                  url: `${w3wUrl}/convert-to-coordinates?words=${destinationWords}&key=${w3w_apiKey}`,
                  headers: {}
                };
                getRequest(destinationToCoordinatesOptions)
                  .then(response => {
                    var destinationToCoordinates = JSON.parse(response);
                    if (
                      typeof destinationToCoordinates.coordinates != "undefined"
                    ) {
                      latDestination = destinationToCoordinates.coordinates.lat;
                      lonDestination = destinationToCoordinates.coordinates.lng;
                      let order = {
                        originWords: "DEVICE_ADDRESS",
                        destinationWords: destinationWords,
                        latStart: attributes.latdevice,
                        lngStart: attributes.lngdevice,
                        latDestination: latDestination,
                        lonDestination: lonDestination,
                        place: pls[0],
                        originSpoken: "DEVICE_ADDRESS",
                        destinationSpoken: what3wordsDest,
                        confirmedAddress: true
                      };

                      handlerInput.attributesManager.setSessionAttributes(
                        order
                      );
                      destinationWords = destinationWords.split(".");

                      let plsDest;
                      if (pls[0] !== "") {
                        plsDest = ` near ${pls[0]}, `;
                      } else {
                        plsDest = ` `;
                      }

                      var speechOutput = requestAttributes.t(
                        "findAddress",
                        destinationWords[0],
                        destinationWords[1],
                        destinationWords[2],
                        plsDest,
                        attributes.deviceAddress
                      );

                      resolve(
                        handlerInput.responseBuilder
                          .speak(speechOutput)
                          .reprompt(speechOutput)
                          .getResponse()
                      );
                    } else {
                      console.log("error at destinationToCoordinates: ", error);
                      var speechOutput = requestAttributes.t("noCoordinates");
                      resolve(
                        handlerInput.responseBuilder
                          .speak(speechOutput)
                          .getResponse()
                      );
                    }
                  })
                  .catch(error => {
                    console.log("error at getw3wSuggestions: ", error);
                    var speechOutput = requestAttributes.t("NO_W3W_ADDRESS");
                    resolve(
                      handlerInput.responseBuilder
                        .speak(speechOutput)
                        .getResponse()
                    );
                  });
              }
            })
            .catch(error => {
              console.log("error at getw3wSuggestions: ", error);
              var speechOutput = requestAttributes.t("NO_W3W_ADDRESS");
              resolve(
                handlerInput.responseBuilder.speak(speechOutput).getResponse()
              );
            });
        });
      } else {
        var speechOutput = requestAttributes.t(
          "wrongAddress",
          whatThreewordDest
        );
        return handlerInput.responseBuilder
          .speak(speechOutput)
          .reprompt(speechOutput)
          .getResponse();
      }
    }
  }
};

// TAXI INTENT to collect slot inputs
const InProgressGetTaxiFromThreeWordsIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      (handlerInput.requestEnvelope.request.intent.name ===
        "GetTaxiFromThreeWordsIntent" ||
        handlerInput.requestEnvelope.request.intent.name === "threeWords") &&
      handlerInput.attributesManager.getSessionAttributes()
        .confirmedDestination == true &&
      handlerInput.requestEnvelope.request.dialogState !== "COMPLETED"
    );
  },
  handle(handlerInput) {
    console.log(
      "IN " + handlerInput.requestEnvelope.request.intent.name.toUpperCase()
    );
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    var accessToken =
      handlerInput.requestEnvelope.context.System.user.accessToken;
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    if (accessToken == undefined) {
      let speechOutput = requestAttributes.t("HAVE_UBER_ACCOUNT");
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withLinkAccountCard()
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .addDelegateDirective(currentIntent)
        .getResponse();
    }
  }
};

// TAXI INTENT with collected slot inputs
const CompletedGetTaxiFromThreeWordsIntentHandler = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;

    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      (handlerInput.requestEnvelope.request.intent.name ===
        "GetTaxiFromThreeWordsIntent" ||
        handlerInput.requestEnvelope.request.intent.name === "threeWords") &&
      handlerInput.attributesManager.getSessionAttributes()
        .confirmedDestination == true &&
      handlerInput.requestEnvelope.request.dialogState === "COMPLETED"
    );
  },
  async handle(handlerInput) {
    console.log(
      "IN ",
      handlerInput.requestEnvelope.request.intent.name.toUpperCase(),
      handlerInput.requestEnvelope.request.dialogState
    );
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    //check if account is linked
    var accessToken =
      handlerInput.requestEnvelope.context.System.user.accessToken;
    if (accessToken == undefined) {
      const currentIntent = handlerInput.requestEnvelope.request.intent;
      let speechOutput = requestAttributes.t("HAVE_UBER_ACCOUNT");
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withLinkAccountCard()
        .getResponse();
    } else {
      const attributes = handlerInput.attributesManager.getSessionAttributes();

      const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
      const slotValues = getSlotValues(filledSlots);
      console.log("slots: ", JSON.stringify(slotValues));
      let whatThreewordOrigin = slotValues.whatThreewordOrigin.synonym;
      let whatThreewordDest = attributes.whatThreewordDest;
      let what3wordOrigin = encodeURI(whatThreewordOrigin);
      let what3wordsDest = encodeURI(whatThreewordDest);
      let destLength = whatThreewordDest.split(" ").length;
      let origLength = whatThreewordOrigin.split(" ").length;

      let latStart;
      let lngStart;
      let latDestination;
      let lonDestination;
      let destinationWords;
      let originWords;
      let originPlace;

      if (origLength == 3) {
        if (destLength == 3) {
          return new Promise((resolve, reject) => {
            let options = {
              method: "GET",
              url: `${w3wUrl}/autosuggest?input=${what3wordOrigin}&input-type=generic-voice&key=${w3w_apiKey}&language=en`,
              headers: {}
            };

            getRequest(options)
              .then(response => {
                var originSuggestions = JSON.parse(response);
                console.log(originSuggestions.suggestions[0]);
                // TO CORRECT THE ERROR HANDLER
                if (typeof originSuggestions.suggestions[0] == "undefined") {
                  var speechOutput = requestAttributes.t("noPickupLong");
                  resolve(
                    handlerInput.responseBuilder
                      .speak(speechOutput)
                      .reprompt(speechOutput)
                      .getResponse()
                  );
                } else {
                  originWords = originSuggestions.suggestions[0].words;
                  originPlace = originSuggestions.suggestions[0].nearestPlace.split(
                    ","
                  );

                  let originToCoordinatesOptions = {
                    method: "GET",
                    url: `${w3wUrl}/convert-to-coordinates?words=${originWords}&key=${w3w_apiKey}`,
                    headers: {}
                  };
                  getRequest(originToCoordinatesOptions)
                    .then(response => {
                      var originToCoordinates = JSON.parse(response);
                      if (
                        typeof originToCoordinates.coordinates != "undefined"
                      ) {
                        latStart = originToCoordinates.coordinates.lat;
                        lngStart = originToCoordinates.coordinates.lng;
                        let destinationQuery = {
                          method: "GET",
                          url: `${w3wUrl}/autosuggest?input=${what3wordsDest}&input-type=generic-voice&key=${w3w_apiKey}&language=en`,
                          headers: {}
                        };
                        getRequest(destinationQuery) //get destination
                          .then(response => {
                            var destinationSuggestions = JSON.parse(response);
                            console.log(destinationSuggestions.suggestions);
                            if (
                              typeof destinationSuggestions.suggestions[0] ==
                              "undefined"
                            ) {
                              console.log("cannot find destination w3w");
                              var speechOutput = requestAttributes.t(
                                "noDestination"
                              );
                              resolve(
                                handlerInput.responseBuilder
                                  .speak(speechOutput)
                                  .reprompt(speechOutput)
                                  .getResponse()
                              );
                            } else {
                              destinationWords =
                                destinationSuggestions.suggestions[0].words;
                              let pls = destinationSuggestions.suggestions[0].nearestPlace.split(
                                ","
                              );

                              let destinationToCoordinatesOptions = {
                                method: "GET",
                                url: `${w3wUrl}/convert-to-coordinates?words=${destinationWords}&key=${w3w_apiKey}`,
                                headers: {}
                              };

                              getRequest(destinationToCoordinatesOptions)
                                .then(response => {
                                  var destinationToCoordinates = JSON.parse(
                                    response
                                  );
                                  if (
                                    typeof destinationToCoordinates.coordinates !=
                                    "undefined"
                                  ) {
                                    latDestination =
                                      destinationToCoordinates.coordinates.lat;
                                    lonDestination =
                                      destinationToCoordinates.coordinates.lng;

                                    let order = {
                                      originWords: originWords,
                                      destinationWords: destinationWords,
                                      latStart: latStart,
                                      lngStart: lngStart,
                                      latDestination: latDestination,
                                      lonDestination: lonDestination,
                                      place: pls[0],
                                      originSpoken: what3wordOrigin,
                                      destinationSpoken: what3wordsDest,
                                      originPlace: originPlace[0],
                                      confirmedAddress: true
                                    };

                                    handlerInput.attributesManager.setSessionAttributes(
                                      order
                                    );
                                    destinationWords = destinationWords.split(
                                      "."
                                    );
                                    originWords = originWords.split(".");

                                    let plsDest;
                                    let plsOrig;
                                    if (pls[0] !== "") {
                                      plsDest = ` near ${pls[0]}, `;
                                    } else {
                                      plsDest = ` `;
                                    }
                                    if (originPlace[0] !== "") {
                                      plsOrig = ` near ${originPlace[0]}, `;
                                    } else {
                                      plsOrig = ` `;
                                    }

                                    var speechOutput = requestAttributes.t(
                                      "findAddress",
                                      destinationWords[0],
                                      destinationWords[1],
                                      destinationWords[2],
                                      plsDest,
                                      originWords[0],
                                      originWords[1],
                                      originWords[2],
                                      plsOrig
                                    );
                                    resolve(
                                      handlerInput.responseBuilder
                                        .speak(speechOutput)
                                        .reprompt(speechOutput)
                                        .getResponse()
                                    );
                                  } else {
                                    console.log(
                                      "error at destinationToCoordinates: ",
                                      error
                                    );
                                    var speechOutput = requestAttributes.t(
                                      "noPickup"
                                    );
                                    resolve(
                                      handlerInput.responseBuilder
                                        .speak(speechOutput)
                                        .getResponse()
                                    );
                                  }
                                })
                                .catch(error => {
                                  console.log(
                                    "error at getw3wSuggestions: ",
                                    error
                                  );
                                  var speechOutput = requestAttributes.t(
                                    "NO_W3W_ADDRESS"
                                  );
                                  resolve(
                                    handlerInput.responseBuilder
                                      .speak(speechOutput)
                                      .getResponse()
                                  );
                                });
                            }
                          })
                          .catch(error => {
                            console.log("error at getw3wSuggestions: ", error);
                            var speechOutput = requestAttributes.t(
                              "NO_W3W_ADDRESS"
                            );
                            resolve(
                              handlerInput.responseBuilder
                                .speak(speechOutput)
                                .getResponse()
                            );
                          });
                      } else {
                        console.log("error at originToCoordinates: ", error);
                        var speechOutput = requestAttributes.t("noPickup");
                        resolve(
                          handlerInput.responseBuilder
                            .speak(speechOutput)
                            .getResponse()
                        );
                      }
                    })
                    .catch(error => {
                      console.log("error at getw3wSuggestionsnofocus: ", error);
                      var speechOutput = requestAttributes.t("NO_W3W_ADDRESS");
                      resolve(
                        handlerInput.responseBuilder
                          .speak(speechOutput)
                          .getResponse()
                      );
                    });
                }
              })
              .catch(error => {
                console.log("error at getw3wSuggestionsnofocus: ", error);
                var speechOutput = requestAttributes.t("NO_W3W_ADDRESS");
                resolve(
                  handlerInput.responseBuilder.speak(speechOutput).getResponse()
                );
              });
          });
        } else {
          var speechOutput = requestAttributes.t(
            "wrongDestination",
            whatThreewordDest
          );
          return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt(speechOutput)
            .getResponse();
        }
      } else {
        console.log("no origin 3 word address");
        var speechOutput = requestAttributes.t(
          "wrongPickup",
          whatThreewordOrigin
        );
        return handlerInput.responseBuilder
          .speak(speechOutput)
          .reprompt(speechOutput)
          .getResponse();
      }
    }
  }
};

const NoCorrectAddressHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.NoIntent" &&
      handlerInput.attributesManager.getSessionAttributes().confirmedAddress ==
        true
    );
  },
  handle(handlerInput) {
    console.log(
      "IN " + handlerInput.requestEnvelope.request.intent.name.toUpperCase()
    );
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const timestamp = new Date().toISOString();
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    const uuid = uuidv4();
    const session = `${uuid}-${timestamp}`;
    let speechOutput = requestAttributes.t("actionOption");
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(speechOutput)
      .getResponse();
  }
};

const YesCorrectAddressHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.YesIntent" &&
      handlerInput.attributesManager.getSessionAttributes().confirmedAddress ==
        true
    );
  },
  handle(handlerInput) {
    console.log(
      "IN " + handlerInput.requestEnvelope.request.intent.name.toUpperCase()
    );
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    let accessToken =
      handlerInput.requestEnvelope.context.System.user.accessToken;

    if (accessToken == undefined) {
      const currentIntent = handlerInput.requestEnvelope.request.intent;
      let speechOutput = requestAttributes.t("HAVE_UBER_ACCOUNT");
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withLinkAccountCard()
        .getResponse();
    } else {
      console.log("getting ready to estimate uber");
      return new Promise((resolve, reject) => {
        let uberOptions = {
          method: "GET",
          url: `${uber_url}estimates/time?start_latitude=${attributes.latStart}&start_longitude=${attributes.lngStart}`,
          headers: {
            Authorization: `Token ${server_token}`,
            "Accept-Language": "en_US",
            "Content-Type": "application/json"
          },
          body: ""
        };

        let uberCall;
        let service;
        let serviceName;
        let product_id;
        let destinationPlacein;
        let destinationPlaceto;
        getRequest(uberOptions)
          .then(data => {
            var uberRes = data;
            console.log("returned data: " + uberRes);
            if (uberRes.times[0] === undefined) {
              var speechOutput = requestAttributes.t("NO_NEARBY_UBER");
              resolve(
                handlerInput.responseBuilder.speak(speechOutput).getResponse()
              );
            } else {
              console.log("uber is working", JSON.stringify(uberRes.times));
              var uberResults = uberRes.times;
              console.log("uberResults==> ", uberResults);
              // search for uberX
              function isUberX(displayName) {
                return displayName.localized_display_name === "UberX";
              }

              function isX(uberData) {
                uberCall = uberResult.localized_display_name;
                service = uberCall.split("Uber");
                serviceName = `Uber ${service[1]}`;
              }
              console.log("about to check uberx");

              var uberX = uberResults.find(isUberX);
              if (uberX != undefined) {
                uberResult = uberX;
                isX(uberResult);
              } else {
                var uberResult = uberResults[0];
                if (uberResult.localized_display_name === "UberXL") {
                  isX(uberResult);
                } else {
                  uberCall = `Uber${uberResult.localized_display_name}`;
                  // serviceName = `Uber ${
                  serviceName = `${uberResult.localized_display_name}`;
                }
              }

              product_id = uberResult.product_id;
              console.log("product id: ", product_id);
              if (attributes.place !== "") {
                destinationPlacein = `, in ${attributes.place}, `;
                destinationPlaceto = ` to ${attributes.place} `;
              } else {
                destinationPlacein = ", ";
                destinationPlaceto = " ";
              }

              //estimate ride
              var postData = {
                product_id: product_id,
                start_latitude: attributes.latStart,
                start_longitude: attributes.lngStart,
                end_latitude: attributes.latDestination,
                end_longitude: attributes.lonDestination
              };

              //fixing US problem
              let uberOptions = {
                method: "POST",
                url: `${uber_url}requests/estimate`,
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Accept-Language": "en_US",
                  "Content-Type": "application/json"
                },
                body: postData
              };

              // orderConfirmUber(uberOptions)
              getRequest(uberOptions).then(parsedBody => {
                var parsed = parsedBody;
                let estimate;

                if (parsed.fare || parsed.estimate) {
                  if (parsed.fare) {
                    estimate = parsed.fare;
                  } else {
                    estimate = parsed.estimate;
                  }
                  var duration = parsed.pickup_estimate;
                  let w = attributes.destinationWords
                    .replace(/"/g, "")
                    .split(".");

                  if (estimate.surge_multiplier > 1) {
                    //to check with docs
                    console.log(
                      "surge_multiplier: ",
                      estimate.surge_multiplier
                    );
                    var speechOutput = requestAttributes.t("SURGED_PRICE");
                    resolve(
                      handlerInput.responseBuilder
                        .speak(speechOutput)
                        .getResponse()
                    );
                  } else if (duration === null) {
                    resolve(
                      handlerInput.responseBuilder
                        .speak(requestAttributes.t("NO_DRIVERS_AVAILABLE"))
                        .getResponse()
                    );
                  } else {
                    var speechOutput = requestAttributes.t(
                      "orderDistance",
                      serviceName,
                      w[0],
                      w[1],
                      w[2],
                      destinationPlacein,
                      duration
                    );

                    var cardContent = requestAttributes.t(
                      "orderCard",
                      serviceName,
                      destinationPlaceto,
                      duration
                    );
                    var repromptSpeech = requestAttributes.t("orderConfirm");
                    var title = `${uberCall} to ///${attributes.destinationWords}`;

                    let confirmOrder = {
                      originWords: attributes.originWords,
                      destinationWords: attributes.destinationWords,
                      latStart: attributes.latStart,
                      lngStart: attributes.lngStart,
                      latDestination: attributes.latDestination,
                      lonDestination: attributes.lonDestination,
                      place: attributes.place,
                      product_id: product_id,
                      title: title,
                      cardContent: cardContent,
                      originSpoken: attributes.originSpoken,
                      destinationSpoken: attributes.destinationSpoken,
                      fare_id: estimate.fare_id,
                      confirmedOrder: true
                    };
                    handlerInput.attributesManager.setSessionAttributes(
                      confirmOrder
                    );

                    resolve(
                      handlerInput.responseBuilder
                        .speak(speechOutput)
                        .reprompt(repromptSpeech)
                        .getResponse()
                    );
                  }
                } else if (parsed.code) {
                  switch (parsed.code) {
                    case "current_trip_exists":
                      var speechOutput = requestAttributes.t("EXISTING_TRIP");
                      break;
                    case "not_found":
                      var speechOutput = requestAttributes.t(
                        "not_found",
                        serviceName
                      );
                      break;
                    case "no_product_found":
                      var speechOutput = requestAttributes.t(
                        "no_product_found",
                        serviceName
                      );
                      break;
                    case "distance_exceeded":
                      var speechOutput = requestAttributes.t(
                        "distance_exceeded"
                      );
                      break;
                    case "same_pickup_dropoff":
                      var speechOutput = requestAttributes.t(
                        "same_pickup_dropoff"
                      );
                      break;
                    default:
                      console.log("default error");
                      var speechOutput = requestAttributes.t("defaultError");
                  }
                  resolve(
                    handlerInput.responseBuilder
                      .speak(speechOutput)
                      .getResponse()
                  );
                } else {
                  var speechOutput = requestAttributes.t("defaultError");

                  resolve(
                    handlerInput.responseBuilder
                      .speak(speechOutput)
                      .getResponse()
                  );
                }
              });
            }
          })
          .catch(error => {
            console.log(error);
            var speechOutput = requestAttributes.t("defaultError");
            resolve(
              handlerInput.responseBuilder.speak(speechOutput).getResponse()
            );
          });
      });
    }
  }
};

const NoConfirmOrderHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.NoIntent" &&
      handlerInput.attributesManager.getSessionAttributes().confirmedOrder ==
        true
    );
  },
  handle(handlerInput) {
    console.log(
      "IN " + handlerInput.requestEnvelope.request.intent.name.toUpperCase()
    );
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const timestamp = new Date().toISOString();
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    const uuid = uuidv4();
    const session = `${uuid}-${timestamp}`;
    let speechOutput = requestAttributes.t("Goodbye");
    return handlerInput.responseBuilder.speak(speechOutput).getResponse();
  }
};

const YesConfirmOrderHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.YesIntent" &&
      handlerInput.attributesManager.getSessionAttributes().confirmedOrder ==
        true
    );
  },
  async handle(handlerInput) {
    console.log(
      "IN " + handlerInput.requestEnvelope.request.intent.name.toUpperCase()
    );
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const timestamp = new Date().toISOString();
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    const uuid = uuidv4();
    const session = `${uuid}-${timestamp}`;
    let accessToken =
      handlerInput.requestEnvelope.context.System.user.accessToken;
    if (accessToken == undefined) {
      const currentIntent = handlerInput.requestEnvelope.request.intent;
      let speechOutput = requestAttributes.t("HAVE_UBER_ACCOUNT");
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withLinkAccountCard()
        .getResponse();
    } else {
      return new Promise((resolve, reject) => {
        var postData = {
          product_id: attributes.product_id,
          start_latitude: attributes.latStart,
          start_longitude: attributes.lngStart,
          end_latitude: attributes.latDestination,
          end_longitude: attributes.lonDestination,
          fare_id: attributes.fare_id
        };

        let uberOptions = {
          method: "POST",
          url: `${uber_url}requests`,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Accept-Language": "en_US",
            "Content-Type": "application/json"
          },
          body: postData
        };

        getRequest(uberOptions)
          .then(parsedBody => {
            var parsed = parsedBody;
            console.log("parced status: ", parsed.status);
            if (rideStatus.indexOf(parsed.status) !== -1) {
              let place;
              if (attributes.place !== "") {
                place = ` to ${attributes.place} `;
              } else {
                place = ` `;
              }
              let speechOutput = requestAttributes.t(
                "UberComing",
                parsed.status.replace(/_/g, " ")
              );
              resolve(
                handlerInput.responseBuilder.speak(speechOutput).getResponse()
              );
            } else if (parsed.status === "no_drivers_available") {
              resolve(
                handlerInput.responseBuilder
                  .speak(requestAttributes.t("NO_DRIVERS_AVAILABLE"))
                  .getResponse()
              );
            } else if (parsed.errors && parsed.errors[0].status === 409) {
              if (parsed.meta.surge_confirmation != undefined) {
                var speechOutput = requestAttributes.t("SURGED_PRICE");
                resolve(
                  handlerInput.responseBuilder.speak(speechOutput).getResponse()
                );
              } else {
                resolve(
                  handlerInput.responseBuilder
                    .speak(requestAttributes.t("EXISTING_TRIP"))
                    .getResponse()
                );
              }
            } else if (parsed.errors && parsed.errors[0].status === 422) {
              console.log("ERROR status: ", d.errors[0].status);
              var speechOutput = requestAttributes.t("samePickupDropoff");
              resolve(
                handlerInput.responseBuilder
                  .speak(speechOutput)
                  .reprompt(speechOutput)
                  .getResponse()
              );
            } else if (parsed.status === "_ETIMEDOUT") {
              let uberOptions = {
                method: "GET",
                url: `${uber_url}requests/current`,
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Accept-Language": "en_US",
                  "Content-Type": "application/json"
                },
                body: ""
              };
              getRequest(uberOptions)
                .then(response => {
                  let d = response;
                  if (typeof d.status !== "undefined") {
                    let status = d.status;
                    let request_id = d.request_id;
                    w3w
                      .reverse({
                        coords: `${d.destination.latitude},${d.destination.longitude}`
                      })
                      .then(function(destination) {
                        var words = destination.split(".");

                        let activeUber = {
                          destination: d.destination,
                          status: d.status,
                          request_id: d.request_id,
                          statusCheck: true,
                          words: words
                        };
                        handlerInput.attributesManager.setSessionAttributes(
                          activeUber
                        );
                        let speechOutput = requestAttributes.t(
                          "orderStatus",
                          words[0],
                          words[1],
                          words[2],
                          d.status.replace(/_/g, " ")
                        );
                        resolve(
                          handlerInput.responseBuilder
                            .speak(speechOutput)
                            .getResponse()
                        );
                      });
                  } else if (d.errors[0].status == 404) {
                    console.log("ERROR status: ", d.errors[0].status);
                    var speechOutput = requestAttributes.t("orderProgress");
                    resolve(
                      handlerInput.responseBuilder
                        .speak(speechOutput)
                        .reprompt(speechOutput)
                        .getResponse()
                    );
                  } else {
                    resolve(
                      handlerInput.responseBuilder
                        .speak(requestAttributes.t("problemStatusCheck"))
                        .getResponse()
                    );
                  }
                })
                .catch(function(err) {
                  console.log("ERROR: ", err);
                  resolve(
                    handlerInput.responseBuilder
                      .speak(requestAttributes.t("problemStatusCheck"))
                      .getResponse()
                  );
                });
            } else {
              resolve(
                handlerInput.responseBuilder
                  .speak(requestAttributes.t("UBER_CONNECTION_ERROR"))
                  .getResponse()
              );
            }
          })
          .catch(function(err) {
            console.log(err.statusCode, err.message);
            resolve(
              handlerInput.responseBuilder
                .speak(requestAttributes.t("defaultError"))
                .getResponse()
            );
          });
      });
    }
  }
};

const CheckOrderStatusIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      (handlerInput.requestEnvelope.request.intent.name ===
        "CheckOrderIntent" ||
        handlerInput.requestEnvelope.request.intent.name ===
          "CancelOrderIntent") &&
      handlerInput.attributesManager.getSessionAttributes().devCheck != true
    );
  },
  async handle(handlerInput) {
    console.log(
      "IN " + handlerInput.requestEnvelope.request.intent.name.toUpperCase()
    );
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    let accessToken =
      handlerInput.requestEnvelope.context.System.user.accessToken;
    if (accessToken == undefined) {
      const currentIntent = handlerInput.requestEnvelope.request.intent;
      let speechOutput = requestAttributes.t("HAVE_UBER_ACCOUNT");
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withLinkAccountCard()
        .getResponse();
    } else {
      return new Promise((resolve, reject) => {
        let uberOptions = {
          method: "GET",
          url: `${uber_url}requests/current`,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Accept-Language": "en_US",
            "Content-Type": "application/json"
          },
          body: ""
        };

        getRequest(uberOptions)
          .then(response => {
            let d = response;
            console.log("Status:", d.status);
            if (typeof d.status !== "undefined") {
              let status = d.status;
              let request_id = d.request_id;
              w3w
                .reverse({
                  coords: `${d.destination.latitude},${d.destination.longitude}`
                })
                .then(function(destination) {
                  var words = destination.split(".");

                  let speechOutput = requestAttributes.t(
                    "cancelUber",
                    words[0],
                    words[1],
                    words[2],
                    d.status.replace(/_/g, " ")
                  );

                  let activeUber = {
                    destination: d.destination,
                    status: d.status,
                    request_id: d.request_id,
                    devCheck: true,
                    words: words
                  };
                  handlerInput.attributesManager.setSessionAttributes(
                    activeUber
                  );
                  resolve(
                    handlerInput.responseBuilder
                      .speak(speechOutput)
                      .reprompt(speechOutput)
                      .getResponse()
                  );
                });
            } else if (d.errors[0].status == 404) {
              console.log("ERROR status: ", d.errors[0].status);
              var speechOutput = requestAttributes.t("noActiveRide");
              resolve(
                handlerInput.responseBuilder
                  .speak(speechOutput)
                  .reprompt(speechOutput)
                  .getResponse()
              );
            } else if (d.errors[0].status == 422) {
              console.log("ERROR status: ", d.errors[0].status);
              var speechOutput = requestAttributes.t("samePickupDropoff");
              resolve(
                handlerInput.responseBuilder
                  .speak(speechOutput)
                  .reprompt(speechOutput)
                  .getResponse()
              );
            } else {
              resolve(
                handlerInput.responseBuilder
                  .speak(requestAttributes.t("defaultError"))
                  .getResponse()
              );
            }
          })
          .catch(function(err) {
            console.log("ERROR: ", err);
            resolve(
              handlerInput.responseBuilder
                .speak(requestAttributes.t("defaultError"))
                .getResponse()
            );
          });
      });
    }
  }
};

const CancelOrderIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      (handlerInput.requestEnvelope.request.intent.name ===
        "AMAZON.CancelIntent" ||
        handlerInput.requestEnvelope.request.intent.name ===
          "CancelOrderIntent") &&
      handlerInput.attributesManager.getSessionAttributes().devCheck == true
    );
  },
  async handle(handlerInput) {
    console.log(
      "IN " + handlerInput.requestEnvelope.request.intent.name.toUpperCase()
    );
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    let accessToken =
      handlerInput.requestEnvelope.context.System.user.accessToken;
    if (accessToken === undefined) {
      const currentIntent = handlerInput.requestEnvelope.request.intent;
      let speechOutput = requestAttributes.t("HAVE_UBER_ACCOUNT");
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withLinkAccountCard()
        .getResponse();
    } else {
      return new Promise((resolve, reject) => {
        let uberOptions = {
          method: "DELETE",
          url: `${uber_url}requests/${attributes.request_id}`,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Accept-Language": "en_US",
            "Content-Type": "application/json"
          },
          body: ""
        };

        getRequest(uberOptions)
          .then(response => {
            let d = response;
            var speechOutput = requestAttributes.t(
              "rideCanceled",
              attributes.words[0],
              attributes.words[1],
              attributes.words[2]
            );
            resolve(
              handlerInput.responseBuilder.speak(speechOutput).getResponse()
            );
          })
          .catch(function(err) {
            console.log("ERROR: ", err);
            resolve(
              handlerInput.responseBuilder
                .speak(requestAttributes.t("defaultError"))
                .getResponse()
            );
          });
      });
    }
  }
};

const StopHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      (handlerInput.requestEnvelope.request.intent.name ===
        "AMAZON.StopIntent" ||
        handlerInput.requestEnvelope.request.intent.name ===
          "AMAZON.CancelIntent")
    );
  },
  handle(handlerInput) {
    console.log(
      "IN " + handlerInput.requestEnvelope.request.intent.name.toUpperCase()
    );
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t("STOP_MESSAGE"))
      .getResponse();
  }
};

const SessionEndedRequest = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "SessionEndedRequest";
  },
  handle(handlerInput) {
    console.log(
      `Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`
    );
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t("ERROR"))
      .getResponse();
  }
};

const UnhandledIntent = {
  canHandle() {
    return true;
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t("UNHANDLED"))
      .reprompt(requestAttributes.t("UNHANDLED"))
      .getResponse();
  }
};

const HelpIntent = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.HelpIntent"
    );
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t("HELP_MESSAGE"))
      .reprompt(requestAttributes.t("HELP_REPROMPT"))
      .getResponse();
  }
};

//to add it on the setup
const RequestLog = {
  process(handlerInput) {
    console.log(
      "REQUEST ENVELOPE = " + JSON.stringify(handlerInput.requestEnvelope)
    );
    return;
  }
};

const ErrorHandler = {
  canHandle(handlerInput) {
    return true;
  },
  handle(handlerInput, error) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const isGeoSupported =
      handlerInput.requestEnvelope.context.System.device.supportedInterfaces
        .Geolocation;
    console.log("Error name: " + JSON.stringify(error.name));
    console.log("Error status: " + JSON.stringify(error.statusCode));
    console.log("Error handled: " + JSON.stringify(error.message));
    console.log("handlerInput:" + JSON.stringify(handlerInput));

    if (error.name === "ServiceError") {
      if (error.statusCode === 403) {
        if (isGeoSupported) {
          return handlerInput.responseBuilder
            .speak(requestAttributes.t("Enable_Location"))
            .withAskForPermissionsConsentCard([
              "alexa::devices:all:geolocation:read"
            ])
            .getResponse();
        } else {
          return handlerInput.responseBuilder
            .speak(requestAttributes.t("Enable_Address"))
            .withAskForPermissionsConsentCard([
              "read::alexa:device:all:address"
            ])
            .getResponse();
        }
      }
      return handlerInput.responseBuilder
        .speak(requestAttributes.t("LOCATION_FAILURE"))
        .reprompt(requestAttributes.t("LOCATION_FAILURE"))
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(requestAttributes.t("NO_W3W_CONNECTION"))
        .getResponse();
    }
  }
};

//Helper Functions

function getSlotValues(filledSlots) {
  const slotValues = {};

  console.log(`The filled slots: ${JSON.stringify(filledSlots)}`);
  Object.keys(filledSlots).forEach(item => {
    const name = filledSlots[item].name;

    if (
      filledSlots[item] &&
      filledSlots[item].resolutions &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code
    ) {
      switch (
        filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code
      ) {
        case "ER_SUCCESS_MATCH":
          slotValues[name] = {
            synonym: filledSlots[item].value,
            resolved:
              filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0]
                .value.name,
            isValidated: true
          };
          break;
        case "ER_SUCCESS_NO_MATCH":
          slotValues[name] = {
            synonym: filledSlots[item].value,
            resolved: filledSlots[item].value,
            isValidated: false
          };
          break;
        default:
          break;
      }
    } else {
      slotValues[name] = {
        synonym: filledSlots[item].value,
        resolved: filledSlots[item].value,
        isValidated: false
      };
    }
  }, this);

  return slotValues;
}

function getRequest(options) {
  return new Promise((resolve, reject) => {
    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      console.log("request error: ", error);
      let data = body ? body : "";
      console.log("request data: ", data);
      return resolve(data);
    });
  });
}

// This request interceptor will bind a translation function 't' to the handlerInput
const LocalizationInterceptor = {
  process(handlerInput) {
    const localizationClient = i18n.use(sprintf).init({
      lng: Alexa.getLocale(handlerInput.requestEnvelope),
      resources: languageStrings
    });
    localizationClient.localize = function localize() {
      const args = arguments;
      const values = [];
      for (let i = 1; i < args.length; i += 1) {
        values.push(args[i]);
      }
      const value = i18n.t(args[0], {
        returnObjects: true,
        postProcess: "sprintf",
        sprintf: values
      });
      if (Array.isArray(value)) {
        return value[Math.floor(Math.random() * value.length)];
      }
      return value;
    };
    const attributes = handlerInput.attributesManager.getRequestAttributes();
    attributes.t = function translate(...args) {
      return localizationClient.localize(...args);
    };
  }
};

// Skill set up
const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    InProgressGetTaxiHandler,
    CompletedGetTaxiHandler,
    GetTaxiFromDeviceIntentHandler,
    InProgressGetTaxiFromThreeWordsIntentHandler,
    CompletedGetTaxiFromThreeWordsIntentHandler,
    CheckOrderStatusIntentHandler,
    YesCorrectAddressHandler,
    NoCorrectAddressHandler,
    YesConfirmOrderHandler,
    NoConfirmOrderHandler,
    CancelOrderIntentHandler,
    SessionEndedRequest,
    HelpIntent,
    StopHandler,
    UnhandledIntent
  )
  .addRequestInterceptors(LocalizationInterceptor)
  .addErrorHandlers(ErrorHandler)
  .withApiClient(new Alexa.DefaultApiClient())
  .lambda();

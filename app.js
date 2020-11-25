/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
const mongoose = require('mongoose')

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var AssistantV2 = require('ibm-watson/assistant/v2'); // watson sdk
var IamAuthenticator = require('ibm-watson/auth').IamAuthenticator;

var Actions = require('./functions/actions');
var actions = new Actions();

var SearchDocs = require('./functions/searchDocs');
var searchDocs = new SearchDocs();

var BankFunctions = require('./functions/bankFunctions');
var bankFunctions = new BankFunctions();

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());


//importing internal modules
const db = require('./functions/db')
const {User} = require('./functions/user')




//connecting to database
const {MongoClient} = require('mongodb')
const uri = "mongodb+srv://Abhi:password@123@freecluster.e18xp.mongodb.net/<dbname>?retryWrites=true&w=majority"
const client = new MongoClient(uri,{useNewUrlParser :true, useUnifiedTopology : true})
try{
  client.connect()
}
catch(e)
{
  console.log(e)
}





// Create the service wrapper
var assistant = new AssistantV2({
  version: '2019-02-28',
  authenticator: new IamAuthenticator({
    apikey: process.env.ASSISTANT_IAM_APIKEY
  }),
  url: process.env.ASSISTANT_URL,
});

/*
 *//*
 * Endpoint to be call from the client side.
 * Required.body.firstcall is set when initialising chat and sends initial context (initContext)
 * Context is then set when required for actions.
 */
app.post('/api/message', function (req, res) {
  console.log('request is ',req.body)
  console.log('response id ',res.body)
  var assistantId = process.env.ASSISTANT_ID || '<assistant-id>';
  if (!assistantId || assistantId === '<assistant-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>ASSISTANT_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-intermediate">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-intermediate/blob/master/training/banking_workspace.json">here</a> in order to get a working application.'
      }
    });
  }

  var textIn = '';

  if(req.body.input) {
    textIn = req.body.input.text;
    console.log(`textIn is : ${textIn}`)
  }

  var payload = {
    assistantId: assistantId,
    sessionId: req.body.session_id,
    input: {
      message_type : 'text',
      text : textIn,
    }
  };


  if (req.body.firstCall || req.body.context) {
    console.log(`payload context is ${req.body.context}`)
    payload.context =  req.body.context ;
  }

  // Send the input to the assistant service
  assistant.message(payload, function (err, data) {
    console.log(`Send the input to the assistant service : ${payload.input.text}`)
    if (err) {
      return res.status(err.code || 500).json(err);
    }


    searchDocs.addDocs(data.result, function () {
      actions.testForAction(data.result, req.body.session_id).then(function (d) {
        return res.json(d);
      }).catch(function (error) {
        return res.json(error);
      });
    });
  });
});

app.get('/bank/validate', function (req, res) {
  var value = req.query.value;
  var isAccValid = bankFunctions.validateAccountNumber(Number(value));
  // if accountNum is in list of valid accounts
  if (isAccValid === true) {
    res.send({ result: 'acc123valid' });
  } else {
    // return invalid by default
    res.send({ result: 'acc123invalid' });
  }
});


app.get('/bank/sendotp', function (req, res) {
  var value = req.query.value;

  console.log(`2nd stage is successfull`)
    let user =  client.db("approver_header").collection("approvers").findOne({ email : value})
    user.then(function(result){
      console.log(result)

      if(result.email === value)
      {
        res.send({ result: 'valid email' })
      }
    })
    .catch((err)=>{
      res.send({result : "Invalid email "})
    })
  /* console.log(`user object is ${user}`)
  if(user.email === value)
  {
    console.log(`3rd stage successfull`)
    res.send({result : 'valid email'})
  }
  else{
    res.send( { result : 'Invaid Email'})
  } */

  // if Email  is in list of valid users
  /* if (user.email === value) {
    console.log(`3rd stage successfull`)
    res.send({ result: 'acc123valid' });
  } else {
    // return invalid by default
    res.send({ result: 'Invalid Email' });
  } */
});



//Reading One Document
async function checkingEmail1(client,nameOfListing){
  const result =  await client.db("approver_header").collection("approvers").findOne({ email : nameOfListing})
  console.log(`result stored is ${result}`)
  if(result)
  {
      console.log(`Found a listing in the collection with the name ${nameOfListing} :`)
      console.log(result)
  }
  else{
      console.log(`No listings found with the name ${nameOfListing}`)
  }
  return result
}





 
app.get('/bank/locate', function (req, res) {
  res.send({ result: 'zip123retrieved' });
});


app.get('/api/session', function (req, res) {
  assistant.createSession({
    assistantId: process.env.ASSISTANT_ID || '{assistant_id}',
  }, function (error, response) {
    if (error) {
      return res.send(error);
    } else {
      return res.send(response);
    }
  });
});

module.exports = app;
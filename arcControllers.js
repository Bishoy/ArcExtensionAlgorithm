var app = angular.module('ArcExtension', []);

app.controller('algorithmCtrl', function ($scope) {

    $scope.steps = [
//        {
//            stepTitle: "1"
//            , agenda: ['item', 'item 2']
//            , chart: {}
//            , arcs: ['arc 1', 'arc 2']
//
//	       }
    ];
	
	

    $scope.rawGrammar = "S->NP VP\nNP->ART ADJ N\nNP ->ART N\nNP ->ADJ N\nVP->ADJ N\nVP->AUX VP\nVP->V NP";
    $scope.rawLexicon = "the: ART\nlarge: ADJ\ncan: N,AUX,V\nhold: N,V\nwater: N,V";
    $scope.parseSentence = "the large can hold water";
    var initiated = false;

    $scope.runStep = function () {
        if (!initiated) {
            parseGrammarAndLexicon($scope.rawGrammar, $scope.rawLexicon);
            $scope.tokens = tokenizeTheSentence();
            initiated = true;
        }

        
        var step = {
            alerts: []
            , arcs: [],
            agenda:[]
        };

    
        if ($scope.steps.length > 0) {
            var currentSteps = $scope.steps;
            var lastStep = currentSteps[currentSteps.length - 1];
            var lastAgenda = lastStep.agenda;
            
            lastAgenda.forEach(function(item){
                if(item.isUsed==false)
                    {
                        addToAgenda(step.agenda,item.category);
                    }
            });
        }
        
        // getting Items to work in in the next iteration
        var unUsedPremise = step.agenda.filter(function(agendaItem){return agendaItem.isUsed==false});
        

        step.alerts.push("Checking the agenda");
        if (step.agenda.length == 0|| !unUsedPremise) {
            step.agenda = [];

            var currentToken = $scope.tokens.pop();

            if (currentToken) {

                console.log(currentToken);

                var tokenCategories = $scope.LexiconDictionary[currentToken];

                step.alerts.push("Agenda is Empty !! grabbing the interpretation of the next token '" + currentToken + "' from the sentence");
                step.alerts.push("Lexical categories found are (" + tokenCategories.join(',') + ') , adding them to the agenda');
                console.log("categories for the token :'" + currentToken + "' are " + tokenCategories.join(','));
     
                
                
                tokenCategories.forEach(function (category) {
                    addToAgenda(step.agenda,category);
                });

                var activeArcs = moveDotsAndGetArcs(step);

                console.log("rules that are affected are ");
                console.log(activeArcs);

                step.arcs = activeArcs;

            } else {
                console.log("Finished,nothing more to process");
                return false;
            }
        } else {

                step.alerts.push("Agenda is not empty, found the following unused constituents (" + unUsedPremise.map(function(item){return item.category}).join(',') + ")");

                var activeArcs = moveDotsAndGetArcs(step);

                console.log("rules that are affected are ");
                console.log(activeArcs);

                step.arcs = activeArcs;

        }


        $scope.steps.push(step);

        return true;

    }

    $scope.runAll = function () {
        parseGrammarAndLexicon($scope.rawGrammar, $scope.rawLexicon);
    }

    // move the dots in the concerned arcs and return them
    function moveDotsAndGetArcs(step) {
        var currentAgenda = step.agenda;
        var currentAlerts = step.alerts;
        var grammarLines = $scope.grammarLines;
        var activatedArcs = [];
        currentAgenda.forEach(function (agendaItem, index) {
            if (!agendaItem.isUsed) {
                currentAlerts.push("Grabbing '"+agendaItem.category+"' from the Agenda");  
                grammarLines.forEach(function (grammarLine, index) {
                    if (!grammarLine.dotIndex) {
                        grammarLine.dotIndex = 0;
                    }
                     var category = agendaItem.category;
                    // If we find that the element after the dot (initially at zero) is the same as the category ,then this arc can be 
                    // advanced and it is hence activated
                    if (grammarLine.consequence[grammarLine.dotIndex] == category) {
                        if (grammarLine.dotIndex < grammarLine.consequence.length) {
                            grammarLine.dotIndex++;
                            
                            // rule no.3 in arc extensions: for the fulfilled consequences add the premise (constituent) to the Agenda
                            if(grammarLine.dotIndex==grammarLine.consequence.length)
                            {
                              
                               var added=  addToAgenda(currentAgenda,grammarLine.premise);
                                
                                if(added)
                                    {
                                          currentAlerts.push("Added '"+grammarLine.premise+"' to the agenda");
                                    }
                            }
                        }
                        activatedArcs.push(angular.copy(grammarLine));
                    }

                });
                agendaItem.isUsed=true;
            }
        });

        return activatedArcs;
    }
    
    // Adds a new constituent to the agenda if the agenda doesn't already have it
    function addToAgenda(agenda,premise)
    {
        if(!agenda.find((agendaItem)=>{ return agendaItem.category===premise;}))
            {
                agenda.push({category:premise,isUsed:false});
                return true;
            }
        else
            {
                console.log("Repeated premise :"+premise);
                return false;
            }
    }

    // converts the sentence into a word list of tokens
    function tokenizeTheSentence() {
        return $scope.parseSentence.toLowerCase().split(' ').map(function (word) {
            return word.trim()
        }).reverse();
    }

    // parse the grammar and the lexicon and populate the scope variable's grammarLines and lexiconDict
    function parseGrammarAndLexicon(grammar, lexicon) {

        console.log(grammar);
        console.log(lexicon);


        // Parsing The Grammar
        $scope.grammarLines = [];

        var grammarLines = $scope.grammarLines;

        var grammarLinesArr = grammar.split("\n");
        var gIterator = 0;


        // Premise is the left hand side , consequence is the right hand side
        grammarLinesArr.forEach(function (grammarLine) {

            var lineObjectsArr = grammarLine.split("->");

            var premise = lineObjectsArr[0].trim();
            var consequenceArr = lineObjectsArr[1].split(" ").map(function (literal) {
                return literal.trim()
            });
            var grammarLineObj = {
                premise: premise
                , consequence: consequenceArr
            }


            grammarLines.push(grammarLineObj);
        });

        console.log(grammarLines);

        // Parsing the Lexicon
        $scope.LexiconDictionary = {};
        var lexiconDict = $scope.LexiconDictionary;

        var LexiconLinesArr = lexicon.split("\n");

        LexiconLinesArr.forEach(function (lexiconLine, index) {

            var lineObjectsArr = lexiconLine.split(":");

            //            var word = lineObjectsArr[0].trim();
            //            var keysArr = lineObjectsArr[1].split(",").map(function (literal) {
            //                return literal.trim()
            //            });
            //
            //            keysArr.forEach(function (key, index) {
            //
            //                if (!lexiconDict[key]) {
            //                    lexiconDict[key] = [];
            //                }
            //                lexiconDict[key].push(word);
            //
            //            });

            var key = lineObjectsArr[0].trim();
            var categories = lineObjectsArr[1].split(",").map(function (literal) {
                return literal.trim()
            });

            lexiconDict[key] = categories;
        });


        console.log(lexiconDict);


    }

});
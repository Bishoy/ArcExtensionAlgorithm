var app = angular.module('ArcExtension', []);

app.factory('Arc', function (Agenda) {

    function Arc() {}

    Arc.prototype = {
        positionFrom: -1
        , positionTo: 0
        , dotIndex: 0
        , premise: ''
        , consequence: []
        , activate: function (aItem, step) {
            var category = aItem.category;
            var currentAgenda = step.agenda;
            var currentAlerts = step.alerts;

            var isActive = false;
            if (this.positionFrom == -1) {
                this.positionFrom = step.position;
                isActive = true;
            }


            // Check if the arc can be extended by the new agenda item or not . a new active arc activates directly 
            // while for an arc that will be extended we have to check 

            if (this.dotIndex < this.consequence.length && this.consequence[this.dotIndex] == category &&
                (isActive || aItem.positionFrom == this.positionTo)) {
                this.dotIndex++;


                this.positionTo = aItem.positionTo;

                // rule no.3 in arc extensions: for the fulfilled consequences add the premise (constituent) to the Agenda
                if (this.dotIndex == this.consequence.length) {
                    var added = currentAgenda.addToAgenda(this.premise, this.positionFrom, this.positionTo);
                    if (added) {
                        currentAlerts.push("Added '" + added.identifier + "' to the agenda from " + this.positionFrom + " to " + this.positionTo);
                    }
                }

                return true;
            }
            return false;
        }
    }

    return Arc;
});


app.factory('Agenda', function () {
    function Agenda() {
        this.agendaItems = [];
    }

    Agenda.prototype = {
        agendaItems: [], // Adds a new constituent to the agenda if the agenda doesn't already have it
        addToAgenda: function (premise, from, to) {

            if (!this.agendaItems.find(function (agendaItem) {
                    return agendaItem.category === premise && agendaItem.positionFrom === from && agendaItem.positionTo === to;
                })) {

                var count = 0;

                count = this.agendaItems.filter(function (item) {
                    return item.category === premise
                }).length;

                var newItem = {
                    identifier: premise + (count + 1).toString()
                    , category: premise
                    , positionFrom: from
                    , positionTo: to
                    , isUsed: false
                };
                this.agendaItems.push(newItem);

                return newItem;
            } else {
                console.log("Repeated premise :" + premise);
                return null;
            }
        }
        , getUnusedItems: function () {
            var unusedItems = this.agendaItems.filter(function (agendaItem) {
                return agendaItem.isUsed == false
            });

            return unusedItems.length > 0 ? unusedItems : null;
        }
        , isEmpty: function () {
            return this.agendaItems.length == 0;
        }




    }


    return Agenda;
})

app.controller('algorithmCtrl', ['$scope', 'Arc', 'Agenda', function ($scope, Arc, Agenda) {

    $scope.steps = [];
    $scope.rawGrammar = "S->NP VP\nNP->ART ADJ N\nNP ->ART N\nNP ->ADJ N\nVP->AUX VP\nVP->V NP";
    $scope.rawLexicon = "the: ART\nlarge: ADJ\ncan: N,AUX,V\nhold: N,V\nwater: N,V";
    $scope.parseSentence = "The large can can hold the water";
    $scope.initiated = false;

    $scope.reset = function () {
        $scope.steps = [];
        $scope.initiated = false;
        $scope.done = false;
    }


    
    $scope.runStep = function () {
        if (!$scope.initiated) {
            $scope.tokens = tokenizeTheSentence();

            cleanSpaces();
            
            //validates and fills the scope error messages
            var valid = validateLexiconAndGrammar($scope.parseSentence, $scope.rawGrammar, $scope.rawLexicon);

            if (valid) {
                parseGrammarAndLexicon($scope.rawGrammar, $scope.rawLexicon);

                $scope.initiated = true;
            } else {
                $scope.initiated = false;
                $('#errorModal').modal('show');
                return;
            }
        }

        var step = {
            position: 0
            , alerts: []
            , arcs: []
            , chart: []
            , processedTokens: []
            , agenda: new Agenda()
        };

        $scope.currentStep = step;


        if ($scope.steps.length > 0) {
            var currentSteps = $scope.steps;
            var lastStep = currentSteps[currentSteps.length - 1];

            step = angular.copy(lastStep);

            step.alerts = [];

        }

        // getting Items to work in in the next iteration
        var unUsedPremise = step.agenda.getUnusedItems();

        var activeArcs = [];
        //step.alerts.push("Checking the agenda");
        if (step.agenda.isEmpty() || !unUsedPremise) {
            step.agenda = new Agenda();

            var currentToken = $scope.tokens.pop();
            step.processedTokens.push(currentToken);

            step.position++;

            if (currentToken) {

                console.log(currentToken);

                var tokenCategories = $scope.LexiconDictionary[currentToken];

                step.alerts.push("Agenda is Empty !! grabbing the interpretation of the next token '" + currentToken + "' from the sentence");
                step.alerts.push("Lexical categories found are (" + tokenCategories.join(',') + ') , adding them to the agenda');
                console.log("categories for the token :'" + currentToken + "' are " + tokenCategories.join(','));


                tokenCategories.forEach(function (category) {
                    step.agenda.addToAgenda(category, step.position, step.position + 1);
                });

                activeArcs = moveDotsAndGetArcs(step);


                console.log("rules that are affected are ");
                console.log(activeArcs);

                // step.arcs = activeArcs;

            } else {
                console.log("Finished,nothing more to process");
                $scope.done = true;
                return false;
            }
        } else {

            step.alerts.push("Agenda is not empty, found the following unused constituents (" + unUsedPremise.map(function (item) {
                return item.category
            }).join(',') + ")");

            activeArcs = moveDotsAndGetArcs(step);

            console.log("rules that are affected are ");
            console.log(activeArcs);

            // step.arcs = activeArcs;

        }

        addArcsToChart(step, activeArcs);

        $scope.steps.push(step);

        return true;

    }

    $scope.runAll = function () {

        while ($scope.runStep()) {}



    }



    // move the dots in the concerned arcs and return them
    function moveDotsAndGetArcs(step) {
        var currentAgenda = step.agenda;
        var currentAlerts = step.alerts;
        var grammarLines = $scope.grammarLines;
        var activatedArcs = [];
        currentAgenda.agendaItems.forEach(function (agendaItem, index) {
            // if (!agendaItem.isUsed) {
            var category = agendaItem.category;
            currentAlerts.push("Grabbing '" + agendaItem.identifier + "' from the Agenda");
            // checking if new arc can be added
            grammarLines.forEach(function (grammarLine, index) {


                var arc = angular.copy(grammarLine);

                var shouldBeAdded = arc.activate(agendaItem, step);
                if (shouldBeAdded) {
                    arc.positionFrom = agendaItem.positionFrom;
                    addArcToStep(step, arc);
                    activatedArcs.push(arc);
                }
            });
            // loop on the current arcs in the step
            step.arcs.forEach(function (arc, index) {
                var extended = arc.activate(agendaItem, step);

                if (extended) {
                    activatedArcs.push(arc);
                }

            });

            agendaItem.isUsed = true;
            //  }
        });

        return activatedArcs;
    }

    function addArcToStep(step, arc) {

        if (!step.arcs.find(function (matchArc) {
                return angular.equals(arc, matchArc);
            })) {
            step.arcs.push(angular.copy(arc));
        }

    }


    function addArcsToChart(step, arcs) {
        arcs.forEach(function (arc) {
            if (!step.chart.find(function (matchArc) {
                    return angular.equals(arc, matchArc);
                })) {
                step.chart.push(angular.copy(arc));
            }
        });
    }






    // converts the sentence into a word list of tokens
    function tokenizeTheSentence() {
        var tokens = $scope.parseSentence.toLowerCase().split(' ').map(function (word) {
            return word.trim()
        }).reverse();
        $scope.sentenceLength = tokens.length;
        return tokens;
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
            var grammarLineObj = new Arc();

            grammarLineObj.premise = premise;
            grammarLineObj.consequence = consequenceArr;

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


    function validateLexiconAndGrammar(parseSentence, grammar, rawLexicon) {
        var errors = [];
         $scope.errors = errors;
        
        var grammarRegex = /^[A-Z]+\s*->(\s*[A-Z]+\s*)+$/;
        var lexiconRegex = /^[a-z]+\s*:\s*([A-Z]+\s*(,|$))+/;
        
        var grammarLines = grammar.split('\n');
        
        grammarLines.forEach(function(line){
            if(grammarRegex.test(line))
                {
                    // do nothing for now
                }
            else
                {
                    errors.push('Error in line "'+ line + '" of the grammar, please make sure that constituents are in capital letters followed by -> and the correct constituents separated by space ');
                }
        });
        
        
        var lexiconLines= rawLexicon.split('\n');

        var lexiconKeys=[];
        lexiconLines.forEach(function(line){
            //check regex , if regex succeeds 
            if(lexiconRegex.test(line))
                {
                    var word = line.split(':')[0]
                    // to check if tokens are in the keys or not
                    lexiconKeys.push(word);    
                }
            else
                {
                    errors.push('Error in line "'+ line + '" of the lexicon, please make sure that the word is in small letters followed by colon and the correct constituents separated by commas ');
                }
        });
        
        if( errors.length>0)
            {
                return false;
            }
        
        $scope.tokens.forEach(function(token){
            if(lexiconKeys.indexOf(token)==-1)
                {
                    errors.push(token +' is not present in the lexicon, all sentence words must be present in the lexicon');
                }
        });
        
        
        
        
        if( errors.length>0)
            {
                return false;
            }

       
        return true;
    }
    
    function cleanSpaces()
    {
        $scope.parseSentence=$scope.parseSentence.replace(/[ \t]+/g,' ');
        $scope.rawLexicon=$scope.rawLexicon.replace(/[ \t]+/g,' ');
        $scope.rawGrammar=$scope.rawGrammar.replace(/[ \t]+/g,' ');
    }

    $scope.trailingTrs = function (To) {
        return new Array($scope.sentenceLength - To + 1);
    }

    $scope.leadingTrs = function (from) {
        return new Array(from - 1);
    };

}]);
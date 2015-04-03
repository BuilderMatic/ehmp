var dependencies = [
    "main/ADK",
    'typeahead'
];

define(dependencies, onResolveDependencies);

function onResolveDependencies(ADK, TwitterTypeahead){

    var siteCode = ADK.UserService.getUserSession().get('site');
    var problemSearchURL = ADK.ResourceService.buildUrl('problems-getProblems', {
            siteCode: siteCode,
            limit: 10
        });
    return new Bloodhound({
              datumTokenizer: function (datum) {
                    return Bloodhound.tokenizers.whitespace(datum.value);
              },
              queryTokenizer: Bloodhound.tokenizers.whitespace,
              remote:{
                    url:  problemSearchURL,
                    replace: function (url, query) {
                        if($('#uncodedNew').prop('checked')){
                            url += '&uncoded=1';
                        }
                        url+= '&searchfor=' + query;

                        return url;
                    },
                    filter: function (data) {
                        return $.map(data.data.items, function (problemItem) {
                            return {
                                value: problemItem.problem,
                                problemNumber: problemItem.problemNumber,
                                icd9: problemItem.icd9,
                                lexiconCode: problemItem.lexiconCode,
                                snomed: problemItem.snomed,
                                problemText: problemItem.problemText
                            };
                        });
                    },
                    ajax: {
                        beforeSend: function(){ 
                            $('#problemSearchSpinner').show();
                        },
                        complete: function(){ 
                            $('#problemSearchSpinner').hide();
                        }
                    }
                }
            });
}
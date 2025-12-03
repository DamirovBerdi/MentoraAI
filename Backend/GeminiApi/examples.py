from ai_functions import topic_summarizer, test_analyze, answer_analyze, generate_flash_cards



# Example for topic_summarizer
print(50*'=')
topic = "Qaraqalpaqstan tariyxı"
content = "Qaraqalpaqstan tariyxı áyyemgi dáwirlerden baslap házirgi kúnge shekemgi waqıttı óz ishine aladı. Bul jerde kóplegen mádeniyatlar hám mámleketler rawajlanǵan. Qaraqalpaqlar ózleriniń mádeniyatı, tili hám dástúrleri menen ajıralıp turadı. Tariyxıy dereklerge qaraǵanda, Qaraqalpaqstan jerinde eramızǵa shekemgi VII-VI ásirlerde dáslepki mámleketlik birlespeler payda bolǵan. Orta ásirlerde Xorezm mámleketi quramında bolǵan. XVIII ásirden baslap Rossiya imperiyası tásirine túsken. 1925-jılı Qaraqalpaq avtonomiyalıq wálayatı dúzilip, keyinirek Qaraqalpaqstan Avtonomiyalıq Sovet Socialistik Respublikasına aylandırılǵan. Házirgi waqıtta Ózbekstan Respublikası quramında suverenli respublika esaplanadı."
summary = topic_summarizer(topic, content)
print(f"Topic Summary:\n{summary}\n")



# Example for test_analyze
print(50*'=')
test_answers = [
    {"question": "Ámiwdárya qaysı teńizge quyadı?", "options": {"a": "Qara teńiz", "b": "Aral teńizi", "c": "Kaspiy teńizi"}, "answer": "b", "is_correct": True},
    {"question": "Qaraqalpaqstan gerbinde qanday haywan súwretlengen?", "options": {"a": "Bóri", "b": "Qus", "c": "Jılan"}, "answer": "b", "is_correct": False},
    {"question": "Qaraqalpaqstan Respublikası qashan dúzilgen?", "options": {"a": "1925-jılı", "b": "1991-jılı", "c": "1932-jılı"}, "answer": "a", "is_correct": True},
    {"question": "Qaraqalpaqstan bayraǵında neshe reń bar?", "options": {"a": "Úsh", "b": "Tórt", "c": "Bes"}, "answer": "b", "is_correct": True},
    {"question": "Aral teńiziniń qurıwına tiykarǵı sebep ne?", "options": {"a": "Global jıllıw", "b": "Dáryalardıń suwın awdarıw", "c": "Jer silkiniw"}, "answer": "b", "is_correct": True},
]
analysis = test_analyze(test_answers)
print(f"Test Analysis:\n{analysis}\n")




# Example for answer_analyze
print(50*'=')
question_to_analyze = "Qaraqalpaqstan Respublikası qashan dúzilgen?"
user_answer = "1925-jılı"
analysis_result = answer_analyze(question_to_analyze, user_answer)
print(f"Answer Analysis for '{user_answer}':")
print(f"  Is Correct: {analysis_result.is_correct}")
print(f"  Suggestion: {analysis_result.suggestion}\n")





# Example for generate_flash_cards
print(50*'=')
flash_cards_topic = "Qaraqalpaqstan tariyxı"
flash_cards_content = "Qaraqalpaqstan tariyxı áyyemgi dáwirlerden baslap házirgi kúnge shekemgi waqıttı óz ishine aladı. Bul jerde kóplegen mádeniyatlar hám mámleketler rawajlanǵan. Qaraqalpaqlar ózleriniń mádeniyatı, tili hám dástúrleri menen ajıralıp turadı. Tariyxıy dereklerge qaraǵanda, Qaraqalpaqstan jerinde eramızǵa shekemgi VII-VI ásirlerde dáslepki mámleketlik birlespeler payda bolǵan. Orta ásirlerde Xorezm mámleketi quramında bolǵan. XVIII ásirden baslap Rossiya imperiyası tásirine túsken. 1925-jılı Qaraqalpaq avtonomiyalıq wálayatı dúzilip, keyinirek Qaraqalpaqstan Avtonomiyalıq Sovet Socialistik Respublikasına aylandırılǵan. Házirgi waqıtta Ózbekstan Respublikası quramında suverenli respublika esaplanadı. 1991-jılı Ózbekstan Respublikası ǵárezsizlikke eriskennen soń, Qaraqalpaqstan Respublikası da suverenli respublika retinde Ózbekstan quramında óz ornın iyeledi."

flash_cards = generate_flash_cards(flash_cards_topic, flash_cards_content)
print(f"Generated Flash Cards for '{flash_cards_topic}':")
for i, card in enumerate(flash_cards):
    print(f"  Flash Card {i+1}:")
    print(f"    Title: {card.title}")
    print(f"    Description: {card.description}\n")
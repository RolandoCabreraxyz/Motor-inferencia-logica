% ============================================================
% BASE DE CONOCIMIENTO - Motor de Inferencia Logica
% Dominio: Gestion de Contratos y Penalizaciones
% ============================================================

% --- HECHOS: Contratos ---
contract(contract1).
contract(contract2).
contract(contract3).
contract(contract4).

% contract_status(Contrato, Estado)
% Estados: active, expired, suspended
contract_status(contract1, active).
contract_status(contract2, expired).
contract_status(contract3, active).
contract_status(contract4, suspended).

% contract_type(Contrato, Tipo)
% Tipos: standard, premium, trial
contract_type(contract1, premium).
contract_type(contract2, standard).
contract_type(contract3, trial).
contract_type(contract4, premium).

% contract_days_overdue(Contrato, Dias)
contract_days_overdue(contract1, 0).
contract_days_overdue(contract2, 45).
contract_days_overdue(contract3, 5).
contract_days_overdue(contract4, 30).

% --- HECHOS: Clientes ---
client(client_a).
client(client_b).
client(client_c).

% client_contract(Cliente, Contrato)
client_contract(client_a, contract1).
client_contract(client_b, contract2).
client_contract(client_b, contract3).
client_contract(client_c, contract4).

% client_payments_missed(Cliente, NumPagos)
client_payments_missed(client_a, 0).
client_payments_missed(client_b, 3).
client_payments_missed(client_c, 1).

% --- HECHOS: Servicios ---
service(hosting).
service(support).
service(consulting).

% service_contract(Servicio, Contrato)
service_contract(hosting, contract1).
service_contract(support, contract1).
service_contract(hosting, contract2).
service_contract(consulting, contract3).
service_contract(support, contract4).

% --- REGLAS DE INFERENCIA ---

% Un contrato esta vencido si su estado es expired
overdue_contract(Contract) :-
    contract(Contract),
    contract_status(Contract, expired).

% Un contrato esta en riesgo si lleva mas de 10 dias vencido
at_risk_contract(Contract) :-
    contract(Contract),
    contract_days_overdue(Contract, Days),
    Days > 10.

% Se aplica penalizacion si el contrato esta vencido mas de 30 dias
penalty_applicable(Contract) :-
    contract(Contract),
    contract_days_overdue(Contract, Days),
    Days > 30.

% Penalizacion tambien aplica si el contrato esta suspendido
penalty_applicable(Contract) :-
    contract(Contract),
    contract_status(Contract, suspended).

% Un contrato es elegible para renovacion si esta activo
eligible_for_renewal(Contract) :-
    contract(Contract),
    contract_status(Contract, active).

% Un contrato NO es elegible para renovacion si esta suspendido
eligible_for_renewal(Contract) :-
    contract(Contract),
    contract_status(Contract, expired),
    contract_days_overdue(Contract, Days),
    Days < 60.

% Cliente en incumplimiento: tiene 2 o mas pagos perdidos
client_in_default(Client) :-
    client(Client),
    client_payments_missed(Client, Missed),
    Missed >= 2.

% Un cliente es premium si tiene algun contrato de tipo premium
premium_client(Client) :-
    client(Client),
    client_contract(Client, Contract),
    contract_type(Contract, premium).

% Servicio disponible: el contrato asociado esta activo
service_available(Service) :-
    service(Service),
    service_contract(Service, Contract),
    contract_status(Contract, active).

% Un cliente puede acceder a un servicio si su contrato esta activo
client_can_access(Client, Service) :-
    client(Client),
    service(Service),
    client_contract(Client, Contract),
    service_contract(Service, Contract),
    contract_status(Contract, active).

% Requiere intervencion: penalizacion aplicable Y cliente en incumplimiento
requires_intervention(Client) :-
    client(Client),
    client_contract(Client, Contract),
    penalty_applicable(Contract),
    client_in_default(Client).

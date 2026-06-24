-- Add a street address to places.
--
-- Plans previously surfaced only a neighborhood ("Berlin, Kreuzberg"), which
-- reads as vague. Venues now carry a real street address, shown on the plan and
-- accepted views and in the WhatsApp invite. Nullable: the 33 seed venues are
-- backfilled from data/places.json via the migrate script, but venues created
-- later (LLM-generated or user-suggested) may not have one resolved yet.

alter table public.places
  add column if not exists address text;

-- Backfill the 33 committed seed venues (data/places.json) by id. Idempotent:
-- re-running just rewrites the same address onto the same row.
update public.places set address = 'Boxhagener Str. 106, 10245 Berlin' where id = '1099c4bb-a06d-47b6-8310-dab96f9ef4cd';
update public.places set address = 'Auguststraße 24, 10117 Berlin' where id = 'e082d400-7fb3-4af3-a4b6-26aba128c0df';
update public.places set address = 'Am Wriezener Bahnhof, 10243 Berlin' where id = 'a83a15c0-7bdf-4406-bf61-5a6c63f93e40';
update public.places set address = 'Görlitzer Str. 1, 10997 Berlin' where id = '56d5fedb-6fe2-4412-8c6c-107964d6cf6e';
update public.places set address = 'Oderberger Str. 35, 10435 Berlin' where id = 'e046c6b3-57eb-432f-a2ea-2212bf17b6c5';
update public.places set address = 'Oranienstraße 187, 10999 Berlin' where id = '23463167-c97d-4811-b38c-8a0f67e9c499';
update public.places set address = 'Potsdamer Str. 50, 10785 Berlin' where id = '53c5b798-eb16-4c18-b958-60e6ac7f895e';
update public.places set address = 'Johannisstraße 20, 10117 Berlin' where id = '4bb70593-f354-46f4-8230-c83fe0543b68';
update public.places set address = 'Brunnenstraße 177, 10119 Berlin' where id = 'ac9ae6da-ae7a-40e1-859e-cfa0332891bb';
update public.places set address = 'Kastanienallee 7-9, 10435 Berlin' where id = '6ef4663f-b7f1-4837-82a5-80494edffbd7';
update public.places set address = 'Bernauer Str. 63-64, 13355 Berlin' where id = '5ed1b2e3-1cd5-4122-8396-53a3107df71c';
update public.places set address = 'Seydlitzstraße 6, 10557 Berlin' where id = 'd7fbd8dc-fa7e-4b7a-9631-159ab9c88ac4';
update public.places set address = 'Tempelhofer Damm 1, 12101 Berlin' where id = '3b955841-2521-4b9a-a87a-6cf61ad7ef3d';
update public.places set address = 'Zionskirchplatz 1, 10119 Berlin' where id = 'c065e149-ca81-4d34-8c8a-40b87dc907e5';
update public.places set address = 'Weserstraße 33, 12045 Berlin' where id = 'dc5e6fc7-f0a2-4dc4-8372-e98e7440b2fb';
update public.places set address = 'Schwedenstraße 14, 13357 Berlin' where id = '5165462b-531f-4f70-aec1-ecd1dc566e71';
update public.places set address = 'Lychener Str. 11, 10437 Berlin' where id = 'c16d25bb-78d9-4333-884e-3c00b0432d21';
update public.places set address = 'Karl-Marx-Straße 66, 12043 Berlin' where id = '1cd06141-ea94-470e-96a8-d39a85ae241d';
update public.places set address = 'Lichtensteinallee 2, 10787 Berlin' where id = 'abbd3518-62a6-4d2f-b0cf-f7dbffc9ceab';
update public.places set address = 'Eisenbahnstraße 42-43, 10997 Berlin' where id = '92d403c1-2d8b-4edb-a6c7-15917da644a5';
update public.places set address = 'Gerichtstraße 65, 13347 Berlin' where id = 'b2a90da4-8127-48f2-a94d-b02afb693693';
update public.places set address = 'Vor dem Schlesischen Tor 2a, 10997 Berlin' where id = '23543de8-d7fc-455f-9ecb-668a548cad80';
update public.places set address = 'Boxhagener Str. 107, 10245 Berlin' where id = '5798247b-aafb-47fa-bbe0-43a0a1fd5afd';
update public.places set address = 'Gerichtstraße 35, 13347 Berlin' where id = '0098d894-40b6-485e-ae68-2af0ca658513';
update public.places set address = 'Kantstraße 79, 10627 Berlin' where id = '729a94c4-1dcc-4c3d-ba51-07f83c4b5263';
update public.places set address = 'Mariannenplatz 2, 10997 Berlin' where id = '7a7187c5-6bc0-4586-89f8-ec738bf9a16d';
update public.places set address = 'Schlesische Str. 38, 10997 Berlin' where id = 'c24fb113-4db9-45d0-9565-c2ff0a0885b4';
update public.places set address = 'Alexanderstraße 7, 10178 Berlin' where id = '10c1a6d3-688f-40d3-8d49-0d454d8e4ca9';
update public.places set address = 'Wiener Str. 59h, 10999 Berlin' where id = 'f2bbc43f-8ddc-4de3-a510-fc632d4410ab';
update public.places set address = 'Hauptstraße 15, 10317 Berlin' where id = '8ccf6ec6-4cc9-493b-ae91-71758997f5fe';
update public.places set address = 'Akazienstraße 27, 10823 Berlin' where id = 'bba438ca-b402-478b-9c0d-a640c8e0e104';
update public.places set address = 'Torstraße 140, 10119 Berlin' where id = 'f1c53cc8-dbd6-488f-9ed1-670762f9e4ac';
update public.places set address = 'Uferstraße 8-11, 13357 Berlin' where id = '6d520008-db5f-4012-a3e7-f6a9e07c73a1';


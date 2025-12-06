-- Seed sample data mirroring the UI mock state
truncate table messages, follow_ups, site_visits, workflows, properties, leads, users, analytics restart identity;

-- Leads
insert into leads (id, name, phone, email, budget, location, property_type, source, stage, assigned_to, tags, notes, created_at, last_contact) values
('11111111-1111-1111-1111-111111111111','Rajesh Kumar','+91 98765 43210','rajesh.kumar@email.com','₹50L - ₹75L','Whitefield, Bangalore','3 BHK','Facebook Ads','new','Priya Sharma','{"Hot Lead","Investor"}','{"Interested in east-facing property","Prefers gated community"}','2024-01-15','2024-01-15'),
('22222222-2222-2222-2222-222222222222','Anita Desai','+91 87654 32109','anita.desai@email.com','₹30L - ₹45L','Electronic City, Bangalore','2 BHK','Website','contacted','Vikram Singh','{"First-time Buyer"}','{"Looking for ready-to-move property"}','2024-01-14','2024-01-16'),
('33333333-3333-3333-3333-333333333333','Mohammed Farid','+91 76543 21098','mohammed.farid@email.com','₹1Cr - ₹1.5Cr','Koramangala, Bangalore','4 BHK','Referral','site-visit','Priya Sharma','{"Premium","Hot Lead"}','{"Visited 2 properties","Interested in luxury amenities"}','2024-01-10','2024-01-18'),
('44444444-4444-4444-4444-444444444444','Sneha Patel','+91 65432 10987','sneha.patel@email.com','₹40L - ₹55L','HSR Layout, Bangalore','2 BHK','99acres','negotiation','Amit Kumar','{"Ready to Buy"}','{"Negotiating on Sunrise Heights Unit 405"}','2024-01-05','2024-01-19'),
('55555555-5555-5555-5555-555555555555','Karthik Reddy','+91 54321 09876','karthik.reddy@email.com','₹75L - ₹90L','Marathahalli, Bangalore','3 BHK','MagicBricks','follow-up','Vikram Singh','{"NRI"}','{"Currently in US, planning to invest"}','2024-01-12','2024-01-17'),
('66666666-6666-6666-6666-666666666666','Lakshmi Iyer','+91 43210 98765','lakshmi.iyer@email.com','₹60L - ₹80L','Jayanagar, Bangalore','3 BHK','Walk-in','closed-won','Priya Sharma','{"Closed"}','{"Purchased Unit 302 at Green Valley"}','2024-01-01','2024-01-20');

-- Properties
insert into properties (id, title, location, bhk, area, price, description, status, images, created_at) values
('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1','Sunrise Heights','Whitefield, Bangalore','2/3 BHK','1200-1800 sq.ft','₹45L - ₹75L','Premium apartments with world-class amenities including swimming pool, gym, and clubhouse.','available','{"/placeholder.svg"}','2024-01-01'),
('aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2','Green Valley Residency','Electronic City, Bangalore','2/3/4 BHK','1100-2200 sq.ft','₹38L - ₹95L','Eco-friendly living with 70% open space, organic garden, and EV charging stations.','available','{"/placeholder.svg"}','2024-01-05'),
('aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3','Royal Orchid Villas','Sarjapur Road, Bangalore','4 BHK Villa','3500-4500 sq.ft','₹1.8Cr - ₹2.5Cr','Luxury villas with private garden, home theater, and smart home automation.','upcoming','{"/placeholder.svg"}','2024-01-10'),
('aaaaaaa4-aaaa-aaaa-aaaa-aaaaaaaaaaa4','Metro Plaza Commercial','MG Road, Bangalore','Office Space','500-5000 sq.ft','₹80L - ₹4Cr','Grade A commercial space with excellent connectivity and modern infrastructure.','available','{"/placeholder.svg"}','2024-01-08'),
('aaaaaaa5-aaaa-aaaa-aaaa-aaaaaaaaaaa5','Lake View Apartments','Bellandur, Bangalore','3 BHK','1650-1850 sq.ft','₹72L - ₹85L','Serene lake-facing apartments with premium finishes and 24/7 security.','sold','{"/placeholder.svg"}','2023-12-15');

-- Site visits
insert into site_visits (id, lead_id, lead_name, property_id, property_title, date, time, assigned_to, status, feedback) values
('bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1','33333333-3333-3333-3333-333333333333','Mohammed Farid','aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1','Sunrise Heights','2024-01-22','10:00 AM','Priya Sharma','scheduled',null),
('bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2','55555555-5555-5555-5555-555555555555','Karthik Reddy','aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2','Green Valley Residency','2024-01-23','2:00 PM','Vikram Singh','scheduled',null),
('bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3','66666666-6666-6666-6666-666666666666','Lakshmi Iyer','aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2','Green Valley Residency','2024-01-18','11:00 AM','Priya Sharma','completed','Very interested, asked for payment plan details.'),
('bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbb4','11111111-1111-1111-1111-111111111111','Rajesh Kumar','aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1','Sunrise Heights','2024-01-24','4:00 PM','Priya Sharma','scheduled',null);

-- Follow ups
insert into follow_ups (id, lead_id, lead_name, type, date, time, notes, status) values
('ccccccc1-cccc-cccc-cccc-ccccccccccc1','11111111-1111-1111-1111-111111111111','Rajesh Kumar','call','2024-01-21','10:00 AM','Discuss property options and budget','pending'),
('ccccccc2-cccc-cccc-cccc-ccccccccccc2','22222222-2222-2222-2222-222222222222','Anita Desai','whatsapp','2024-01-21','2:00 PM','Send brochure for Electronic City projects','pending'),
('ccccccc3-cccc-cccc-cccc-ccccccccccc3','44444444-4444-4444-4444-444444444444','Sneha Patel','meeting','2024-01-22','11:00 AM','Final negotiation meeting at office','pending'),
('ccccccc4-cccc-cccc-cccc-ccccccccccc4','55555555-5555-5555-5555-555555555555','Karthik Reddy','call','2024-01-20','9:00 PM','International call - discuss investment options','missed'),
('ccccccc5-cccc-cccc-cccc-ccccccccccc5','33333333-3333-3333-3333-333333333333','Mohammed Farid','email','2024-01-19','3:00 PM','Sent detailed project comparison','completed');

-- Messages
insert into messages (id, lead_id, lead_name, phone, content, timestamp, direction, status, type) values
('ddddddd1-dddd-dddd-dddd-ddddddddddd1','11111111-1111-1111-1111-111111111111','Rajesh Kumar','+91 98765 43210','Hi, I saw your ad for 3BHK apartments in Whitefield. Can you share more details?','2024-01-20 10:30:00+05:30','incoming','read','text'),
('ddddddd2-dddd-dddd-dddd-ddddddddddd2','11111111-1111-1111-1111-111111111111','Rajesh Kumar','+91 98765 43210','Hello Rajesh! Thank you for your interest. We have excellent 3BHK options in Whitefield starting from ₹55L. Would you like to schedule a site visit?','2024-01-20 10:35:00+05:30','outgoing','read','text'),
('ddddddd3-dddd-dddd-dddd-ddddddddddd3','11111111-1111-1111-1111-111111111111','Rajesh Kumar','+91 98765 43210','Yes, please share the brochure first.','2024-01-20 10:40:00+05:30','incoming','read','text'),
('ddddddd4-dddd-dddd-dddd-ddddddddddd4','22222222-2222-2222-2222-222222222222','Anita Desai','+91 87654 32109','What is the possession date for Green Valley?','2024-01-20 14:15:00+05:30','incoming','read','text'),
('ddddddd5-dddd-dddd-dddd-ddddddddddd5','22222222-2222-2222-2222-222222222222','Anita Desai','+91 87654 32109','Green Valley possession is expected by December 2024. We have ready units also available if you need immediate possession.','2024-01-20 14:20:00+05:30','outgoing','delivered','text'),
('ddddddd6-dddd-dddd-dddd-ddddddddddd6','33333333-3333-3333-3333-333333333333','Mohammed Farid','+91 76543 21098','Please send me the payment plan for Sunrise Heights 4BHK','2024-01-21 09:00:00+05:30','incoming','delivered','text');

-- Users
insert into users (id, name, email, phone, role, avatar, leads_assigned, deals_closed) values
('eeeeeee1-eeee-eeee-eeee-eeeeeeeeeee1','Priya Sharma','priya.sharma@realestate.com','+91 99887 76655','manager','/placeholder.svg',45,12),
('eeeeeee2-eeee-eeee-eeee-eeeeeeeeeee2','Vikram Singh','vikram.singh@realestate.com','+91 88776 65544','agent','/placeholder.svg',32,8),
('eeeeeee3-eeee-eeee-eeee-eeeeeeeeeee3','Amit Kumar','amit.kumar@realestate.com','+91 77665 54433','agent','/placeholder.svg',28,6),
('eeeeeee4-eeee-eeee-eeee-eeeeeeeeeee4','Neha Gupta','neha.gupta@realestate.com','+91 66554 43322','telecaller','/placeholder.svg',50,0),
('eeeeeee5-eeee-eeee-eeee-eeeeeeeeeee5','Admin User','admin@realestate.com','+91 55443 32211','admin','/placeholder.svg',0,0);

-- Workflows
insert into workflows (id, name, trigger, action, status, last_run, runs_count) values
('fffffff1-ffff-ffff-ffff-fffffffffff1','New Lead Welcome Message','When new lead is created','Send WhatsApp welcome message','active','2024-01-20 10:30 AM',156),
('fffffff2-ffff-ffff-ffff-fffffffffff2','No Response Reminder','Lead not responding for 24 hours','Send WhatsApp follow-up message','active','2024-01-20 8:00 AM',89),
('fffffff3-ffff-ffff-ffff-fffffffffff3','Site Visit Reminder','2 hours before scheduled visit','Send reminder to lead & agent','active','2024-01-19 9:00 AM',45),
('fffffff4-ffff-ffff-ffff-fffffffffff4','Post Visit Follow-up','After site visit is completed','Send thank you & feedback request','active','2024-01-18 3:00 PM',34),
('fffffff5-ffff-ffff-ffff-fffffffffff5','Birthday Wishes','On lead birthday','Send birthday greeting via WhatsApp','inactive',null,12);

-- Analytics snapshot
insert into analytics (id, total_leads, new_leads_today, hot_leads, closed_won, closed_lost, conversion_rate, leads_by_source, leads_by_stage, agent_performance, property_interest)
values (
  1,
  156,
  8,
  23,
  18,
  12,
  11.5,
  '[{"source":"Facebook Ads","count":45},{"source":"99acres","count":32},{"source":"MagicBricks","count":28},{"source":"Website","count":24},{"source":"Referral","count":18},{"source":"Walk-in","count":9}]',
  '[{"stage":"New","count":34},{"stage":"Contacted","count":28},{"stage":"Follow-up","count":42},{"stage":"Site Visit","count":22},{"stage":"Negotiation","count":12},{"stage":"Closed Won","count":18}]',
  '[{"name":"Priya Sharma","leads":45,"followUps":38,"deals":12},{"name":"Vikram Singh","leads":32,"followUps":28,"deals":8},{"name":"Amit Kumar","leads":28,"followUps":22,"deals":6},{"name":"Neha Gupta","leads":50,"followUps":45,"deals":0}]',
  '[{"property":"Sunrise Heights","shares":89,"clicks":234},{"property":"Green Valley","shares":76,"clicks":198},{"property":"Royal Orchid","shares":45,"clicks":156},{"property":"Metro Plaza","shares":32,"clicks":89}]'
);


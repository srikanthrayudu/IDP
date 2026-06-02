-- Seed data for local/demo environments.
-- Passwords are bcrypt hashes for Admin@123, Citizen@123, Ward@123, Worker@123.

-- Wards
INSERT INTO wards (id, number) VALUES
  (1, 1),
  (2, 2),
  (3, 3),
  (4, 4),
  (5, 5),
  (6, 6),
  (7, 7),
  (8, 8),
  (9, 9),
  (10, 10)
ON CONFLICT (number) DO NOTHING;

-- Users (admins, citizens, ward members, workers)
INSERT INTO users (username, password, role, ward_number, department, category_expertise) VALUES
  ('admin', '$2b$10$voPX1Q7NkB4LTQqt.GZ6WulIB8el2xErFquWCjZneI01woUKDwF12', 'ROLE_ADMIN', NULL, NULL, NULL),
  ('citizen1', '$2b$10$52ZmsX4ZzhPaRO5y2d.FYe71hHk73dmsHJAUIvCUGNhUEAQxjxqL.', 'ROLE_USER', NULL, NULL, NULL),
  ('citizen2', '$2b$10$52ZmsX4ZzhPaRO5y2d.FYe71hHk73dmsHJAUIvCUGNhUEAQxjxqL.', 'ROLE_USER', NULL, NULL, NULL),
  ('citizen3', '$2b$10$52ZmsX4ZzhPaRO5y2d.FYe71hHk73dmsHJAUIvCUGNhUEAQxjxqL.', 'ROLE_USER', NULL, NULL, NULL),
  ('citizen4', '$2b$10$52ZmsX4ZzhPaRO5y2d.FYe71hHk73dmsHJAUIvCUGNhUEAQxjxqL.', 'ROLE_USER', NULL, NULL, NULL),
  ('citizen5', '$2b$10$52ZmsX4ZzhPaRO5y2d.FYe71hHk73dmsHJAUIvCUGNhUEAQxjxqL.', 'ROLE_USER', NULL, NULL, NULL),
  ('citizen6', '$2b$10$52ZmsX4ZzhPaRO5y2d.FYe71hHk73dmsHJAUIvCUGNhUEAQxjxqL.', 'ROLE_USER', NULL, NULL, NULL),
  ('citizen7', '$2b$10$52ZmsX4ZzhPaRO5y2d.FYe71hHk73dmsHJAUIvCUGNhUEAQxjxqL.', 'ROLE_USER', NULL, NULL, NULL),
  ('citizen8', '$2b$10$52ZmsX4ZzhPaRO5y2d.FYe71hHk73dmsHJAUIvCUGNhUEAQxjxqL.', 'ROLE_USER', NULL, NULL, NULL),
  ('ward1', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_WARD_MEMBER', 1, NULL, NULL),
  ('ward2', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_WARD_MEMBER', 2, NULL, NULL),
  ('ward3', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_WARD_MEMBER', 3, NULL, NULL),
  ('ward4', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_WARD_MEMBER', 4, NULL, NULL),
  ('ward5', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_WARD_MEMBER', 5, NULL, NULL),
  ('ward6', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_WARD_MEMBER', 6, NULL, NULL),
  ('ward7', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_WARD_MEMBER', 7, NULL, NULL),
  ('ward8', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_WARD_MEMBER', 8, NULL, NULL),
  ('ward9', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_WARD_MEMBER', 9, NULL, NULL),
  ('ward10', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_WARD_MEMBER', 10, NULL, NULL),
  ('worker1', '$2b$10$tYdEiMiqR8pYnpjgwgyvUu80RvsiCfTJjldGIfhKnx8CjD7wkRMPq', 'ROLE_WORKER', 1, NULL, 'Electrical'),
  ('worker2', '$2b$10$tYdEiMiqR8pYnpjgwgyvUu80RvsiCfTJjldGIfhKnx8CjD7wkRMPq', 'ROLE_WORKER', 2, NULL, 'Solid Waste (Garbage) Related'),
  ('worker3', '$2b$10$tYdEiMiqR8pYnpjgwgyvUu80RvsiCfTJjldGIfhKnx8CjD7wkRMPq', 'ROLE_WORKER', 3, NULL, 'Road Maintenance(Engg)'),
  ('worker4', '$2b$10$tYdEiMiqR8pYnpjgwgyvUu80RvsiCfTJjldGIfhKnx8CjD7wkRMPq', 'ROLE_WORKER', 4, NULL, 'Water Supply'),
  ('worker5', '$2b$10$tYdEiMiqR8pYnpjgwgyvUu80RvsiCfTJjldGIfhKnx8CjD7wkRMPq', 'ROLE_WORKER', 5, NULL, 'Streetlights'),
  ('worker6', '$2b$10$tYdEiMiqR8pYnpjgwgyvUu80RvsiCfTJjldGIfhKnx8CjD7wkRMPq', 'ROLE_WORKER', 6, NULL, 'Electrical'),
  ('worker7', '$2b$10$tYdEiMiqR8pYnpjgwgyvUu80RvsiCfTJjldGIfhKnx8CjD7wkRMPq', 'ROLE_WORKER', 7, NULL, 'Solid Waste (Garbage) Related'),
  ('worker8', '$2b$10$tYdEiMiqR8pYnpjgwgyvUu80RvsiCfTJjldGIfhKnx8CjD7wkRMPq', 'ROLE_WORKER', 8, NULL, 'Road Maintenance(Engg)'),
  ('dept_roads', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_DEPARTMENT', NULL, 'Roads', NULL),
  ('dept_water_supply', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_DEPARTMENT', NULL, 'Water Supply', NULL),
  ('dept_sanitation', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_DEPARTMENT', NULL, 'Sanitation', NULL),
  ('dept_electricity', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_DEPARTMENT', NULL, 'Electricity', NULL),
  ('dept_drainage', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_DEPARTMENT', NULL, 'Drainage', NULL),
  ('dept_public_health', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_DEPARTMENT', NULL, 'Public Health', NULL),
  ('dept_traffic', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_DEPARTMENT', NULL, 'Traffic', NULL),
  ('dept_forest', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_DEPARTMENT', NULL, 'Forest', NULL),
  ('dept_animal_welfare', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_DEPARTMENT', NULL, 'Animal Welfare', NULL),
  ('dept_pollution_control', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_DEPARTMENT', NULL, 'Pollution Control', NULL),
  ('dept_town_planning', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_DEPARTMENT', NULL, 'Town Planning', NULL),
  ('dept_parks_and_horticulture', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_DEPARTMENT', NULL, 'Parks & Horticulture', NULL),
  ('care', '$2b$10$FyY7aneJAVYAgbzNz0cDiOYD3DUGHwUvc6vWOXwNeZ6hzNzlZwv1a', 'ROLE_CUSTOMER_CARE', NULL, NULL, NULL)
ON CONFLICT (username) DO NOTHING;

-- Complaints
INSERT INTO complaints (
  id, user_id, text, category, department, status, priority, progress_status,
  assigned_worker_id, assigned_worker_name, bbmp_zone, ward_number,
  latitude, longitude, device_id, is_fraud, created_at
) VALUES
  (1, 2, 'Street light not working near the park entrance.', 'Streetlights', 'Electricity', 'PENDING', 'HIGH', 'NEW', 20, 'worker1', 'East', '1', 12.9718, 77.5949, 'DEV-1001', false, NOW() - INTERVAL '5 days'),
  (2, 3, 'Garbage overflow near main market road.', 'Solid Waste (Garbage) Related', 'Sanitation', 'PENDING', 'MEDIUM', 'IN_PROGRESS', 21, 'worker2', 'South', '2', 12.9352, 77.6245, 'DEV-1002', false, NOW() - INTERVAL '4 days'),
  (3, 4, 'Pothole forming at the junction, causing traffic.', 'Road Maintenance(Engg)', 'Roads', 'RESOLVED', 'LOW', 'RESOLVED', 22, 'worker3', 'West', '3', 12.9630, 77.5667, 'DEV-1003', false, NOW() - INTERVAL '8 days'),
  (4, 5, 'Water leakage reported near apartment gate.', 'Water Supply', 'Water Supply', 'PENDING', 'HIGH', 'NEW', 23, 'worker4', 'North', '4', 12.9987, 77.5924, 'DEV-1004', true, NOW() - INTERVAL '2 days'),
  (5, 6, 'Electric wire sparks during rain.', 'Electrical', 'Electricity', 'PENDING', 'HIGH', 'IN_PROGRESS', 20, 'worker1', 'Central', '1', 12.9700, 77.5800, 'DEV-1005', false, NOW() - INTERVAL '1 day'),
  (6, 7, 'Street light flickers every night near school.', 'Streetlights', 'Electricity', 'PENDING', 'MEDIUM', 'NEW', 24, 'worker5', 'East', '5', 12.9750, 77.6000, 'DEV-1006', false, NOW() - INTERVAL '12 hours'),
  (7, 8, 'Garbage collection missed for two days.', 'Solid Waste (Garbage) Related', 'Sanitation', 'PENDING', 'MEDIUM', 'IN_PROGRESS', 25, 'worker6', 'South', '6', 12.9200, 77.6100, 'DEV-1007', false, NOW() - INTERVAL '3 days'),
  (8, 9, 'Road marking faded near the flyover.', 'Road Maintenance(Engg)', 'Roads', 'PENDING', 'LOW', 'NEW', 26, 'worker7', 'West', '7', 12.9600, 77.5500, 'DEV-1008', false, NOW() - INTERVAL '6 days'),
  (9, 2, 'Low water pressure in the evening.', 'Water Supply', 'Water Supply', 'PENDING', 'MEDIUM', 'IN_PROGRESS', 27, 'worker8', 'North', '8', 13.0000, 77.5800, 'DEV-1009', false, NOW() - INTERVAL '10 hours'),
  (10, 3, 'Transformer buzzing loudly.', 'Electrical', 'Electricity', 'PENDING', 'HIGH', 'NEW', NULL, NULL, 'Central', '9', 12.9650, 77.5850, 'DEV-1010', false, NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- Complaint History
INSERT INTO complaint_history (
  id, complaint_id, old_status, new_status, old_progress_status,
  new_progress_status, remarks, changed_at
) VALUES
  (1, 1, 'PENDING', 'PENDING', 'NEW', 'NEW', 'Complaint created.', NOW() - INTERVAL '5 days'),
  (2, 2, 'PENDING', 'PENDING', 'NEW', 'IN_PROGRESS', 'Assigned to worker.', NOW() - INTERVAL '4 days'),
  (3, 3, 'PENDING', 'RESOLVED', 'IN_PROGRESS', 'RESOLVED', 'Issue fixed on site.', NOW() - INTERVAL '7 days'),
  (4, 4, 'PENDING', 'PENDING', 'NEW', 'NEW', 'Marked for fraud review.', NOW() - INTERVAL '2 days'),
  (5, 5, 'PENDING', 'PENDING', 'NEW', 'IN_PROGRESS', 'Assigned to electrical team.', NOW() - INTERVAL '1 day'),
  (6, 6, 'PENDING', 'PENDING', 'NEW', 'NEW', 'Awaiting technician visit.', NOW() - INTERVAL '12 hours'),
  (7, 7, 'PENDING', 'PENDING', 'NEW', 'IN_PROGRESS', 'Queued for pickup.', NOW() - INTERVAL '3 days'),
  (8, 8, 'PENDING', 'PENDING', 'NEW', 'NEW', 'Inspection scheduled.', NOW() - INTERVAL '6 days'),
  (9, 9, 'PENDING', 'PENDING', 'NEW', 'IN_PROGRESS', 'Assigned to water team.', NOW() - INTERVAL '10 hours'),
  (10, 10, 'PENDING', 'PENDING', 'NEW', 'NEW', 'New complaint created.', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- Sequence alignment
SELECT setval('wards_id_seq', COALESCE((SELECT MAX(id) FROM wards), 1), true);
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);
SELECT setval('complaints_id_seq', COALESCE((SELECT MAX(id) FROM complaints), 1), true);
SELECT setval('complaint_history_id_seq', COALESCE((SELECT MAX(id) FROM complaint_history), 1), true);

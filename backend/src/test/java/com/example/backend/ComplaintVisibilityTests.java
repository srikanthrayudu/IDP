package com.example.backend;

import com.example.backend.model.Complaint;
import com.example.backend.model.User;
import com.example.backend.repository.ComplaintRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.ComplaintService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class ComplaintVisibilityTests {

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void adminSeesAllComplaints() {
        User admin = userRepository.findByUsername("admin").orElseThrow();
        List<Complaint> complaints = complaintService.getComplaintsForRequester(admin);

        assertThat(complaints).hasSize((int) complaintRepository.count());
    }

    @Test
    void wardMemberSeesOnlyWardComplaints() {
        User wardMember = userRepository.findByUsername("ward1").orElseThrow();
        List<Complaint> complaints = complaintService.getComplaintsForRequester(wardMember);
        List<Complaint> wardComplaints = complaintRepository.findByWardNumber("1");

        if (wardComplaints.isEmpty()) {
            Complaint seeded = new Complaint();
            seeded.setText("Test complaint for ward member visibility");
            seeded.setWardNumber("1");
            seeded.setStatus("PENDING");
            seeded.setProgressStatus("NEW");
            complaintRepository.save(seeded);
            complaints = complaintService.getComplaintsForRequester(wardMember);
            wardComplaints = complaintRepository.findByWardNumber("1");
        }

        assertThat(complaints).allMatch(c -> "1".equals(c.getWardNumber()));
        assertThat(complaints).containsExactlyInAnyOrderElementsOf(wardComplaints);
    }
}

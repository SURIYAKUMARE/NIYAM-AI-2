package gov.aicte.approval;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * AICTE Smart Approval and Compliance Management System
 * Production Spring Boot 3 Enterprise Service - Problem Statement ID: 26262
 */
@SpringBootApplication
@EnableScheduling
public class AicteApprovalApplication {
    public static void main(String[] args) {
        SpringApplication.run(AicteApprovalApplication.class, args);
    }
}

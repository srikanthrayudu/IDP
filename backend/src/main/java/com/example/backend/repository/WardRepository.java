package com.example.backend.repository;

import com.example.backend.model.Ward;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WardRepository extends JpaRepository<Ward, Long> {
    boolean existsByNumber(Integer number);

    List<Ward> findAllByOrderByNumberAsc();
}


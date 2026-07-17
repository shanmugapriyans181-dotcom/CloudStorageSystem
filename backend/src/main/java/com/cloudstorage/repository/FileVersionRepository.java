package com.cloudstorage.repository;

import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.FileVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileVersionRepository extends JpaRepository<FileVersion, Long> {

    List<FileVersion> findByFileOrderByVersionNumberDesc(FileEntity file);

    Optional<FileVersion> findByFileAndVersionNumber(FileEntity file, Integer versionNumber);

    @Query("SELECT MAX(fv.versionNumber) FROM FileVersion fv WHERE fv.file = :file")
    Optional<Integer> findMaxVersionNumber(@Param("file") FileEntity file);
}

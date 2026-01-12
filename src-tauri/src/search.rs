// Search logic with tantivy

use std::path::Path;
use tantivy::{
    collector::TopDocs,
    directory::MmapDirectory,
    query::{Query, QueryParser, RegexQuery},
    schema::{Schema, SchemaBuilder, STORED, TEXT},
    Index, IndexReader, IndexWriter, ReloadPolicy, TantivyDocument,
};

pub struct SearchIndex {
    index: Index,
    reader: IndexReader,
    schema: Schema,
}

impl SearchIndex {
    pub fn new(index_path: &Path) -> Result<Self, tantivy::TantivyError> {
        let mut schema_builder = SchemaBuilder::default();

        // Define schema fields
        let _name_field = schema_builder.add_text_field("name", TEXT | STORED);
        let _path_field = schema_builder.add_text_field("path", TEXT | STORED);
        let _size_field = schema_builder.add_u64_field("size", STORED);
        let _modified_field = schema_builder.add_date_field("modified", STORED);
        let _is_folder_field = schema_builder.add_bool_field("is_folder", STORED);

        let schema = schema_builder.build();

        // Create or open index
        let index = if index_path.exists() {
            Index::open(MmapDirectory::open(index_path)?)?
        } else {
            std::fs::create_dir_all(index_path)?;
            Index::create_in_dir(index_path, schema.clone())?
        };

        // Use Manual reload policy - we'll reload manually when needed
        let reader = index
            .reader_builder()
            .reload_policy(ReloadPolicy::Manual)
            .try_into()?;

        Ok(SearchIndex {
            index,
            reader,
            schema,
        })
    }

    pub fn get_schema(&self) -> &Schema {
        &self.schema
    }

    pub fn writer(&self) -> Result<IndexWriter, tantivy::TantivyError> {
        self.index.writer(50_000_000)
    }

    pub fn search(
        &self,
        query_str: &str,
        use_regex: bool,
        limit: usize,
    ) -> Result<Vec<TantivyDocument>, tantivy::TantivyError> {
        // Early return for empty queries
        if query_str.trim().is_empty() {
            return Ok(Vec::new());
        }

        // Reload reader to get latest index updates
        self.reader.reload()?;

        let searcher = self.reader.searcher();
        let schema = self.schema.clone();

        let query: Box<dyn Query> = if use_regex {
            // For regex queries, search in name field
            let name_field = schema.get_field("name")?;
            Box::new(RegexQuery::from_pattern(query_str, name_field)?)
        } else {
            // For text queries, use query parser with optimized settings
            let name_field = schema.get_field("name")?;
            let path_field = schema.get_field("path")?;
            let mut query_parser =
                QueryParser::for_index(&self.index, vec![name_field, path_field]);
            // Boost name field matches (2x) over path matches for better relevance
            query_parser.set_field_boost(name_field, 2.0);
            query_parser.set_field_boost(path_field, 1.0);
            Box::new(query_parser.parse_query(query_str)?)
        };

        // Use TopDocs collector with limit for efficient result retrieval
        let top_docs = searcher.search(&*query, &TopDocs::with_limit(limit.min(1000)))?;

        // Pre-allocate result vector with expected capacity
        let mut results = Vec::with_capacity(top_docs.len());
        for (_score, doc_address) in top_docs {
            let retrieved_doc = searcher.doc(doc_address)?;
            results.push(retrieved_doc);
        }

        Ok(results)
    }

    // Note: reload() is called internally in search() method
    // This public method is kept for potential future use
    #[allow(dead_code)]
    pub fn reload(&self) -> Result<(), tantivy::TantivyError> {
        self.reader.reload()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tantivy::schema::*;
    use tempfile::tempdir;

    fn create_test_index(path: &std::path::Path) -> SearchIndex {
        SearchIndex::new(path).expect("Failed to create test index")
    }

    fn populate_test_index(index: &SearchIndex) -> Result<(), tantivy::TantivyError> {
        let schema = index.get_schema();
        let name_field = schema.get_field("name")?;
        let path_field = schema.get_field("path")?;
        let size_field = schema.get_field("size")?;
        let modified_field = schema.get_field("modified")?;
        let is_folder_field = schema.get_field("is_folder")?;

        let mut writer = index.writer()?;

        let documents = vec![
            (
                "document.txt",
                "/home/user/documents/document.txt",
                1024,
                1640000000,
                false,
            ),
            (
                "report.pdf",
                "/home/user/reports/report.pdf",
                51200,
                1640001000,
                false,
            ),
            (
                "image.jpg",
                "/home/user/images/image.jpg",
                204800,
                1640002000,
                false,
            ),
            ("folder", "/home/user/folder", 0, 1640003000, true),
            (
                "notes.txt",
                "/home/user/folder/notes.txt",
                512,
                1640004000,
                false,
            ),
        ];

        for (name, path, size, modified, is_folder) in documents {
            let mut doc = tantivy::TantivyDocument::default();
            doc.add_text(name_field, name);
            doc.add_text(path_field, path);
            doc.add_u64(size_field, size);
            doc.add_date(
                modified_field,
                tantivy::DateTime::from_timestamp_secs(modified),
            );
            doc.add_bool(is_folder_field, is_folder);
            writer.add_document(doc)?;
        }

        writer.commit()?;
        Ok(())
    }

    #[test]
    fn test_search_index_new_creates_directory() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");

        assert!(
            !index_path.exists(),
            "Index path should not exist initially"
        );

        let index = SearchIndex::new(&index_path);
        assert!(index.is_ok(), "SearchIndex::new should succeed");

        assert!(index_path.exists(), "Index directory should be created");
    }

    #[test]
    fn test_search_index_new_opens_existing_index() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");

        let index1 = create_test_index(&index_path);
        populate_test_index(&index1).unwrap();

        let index2 = SearchIndex::new(&index_path);
        assert!(index2.is_ok(), "Should be able to open existing index");
    }

    #[test]
    fn test_get_schema() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");
        let index = create_test_index(&index_path);

        let schema = index.get_schema();
        assert!(schema.get_field("name").is_ok(), "Should have name field");
        assert!(schema.get_field("path").is_ok(), "Should have path field");
        assert!(schema.get_field("size").is_ok(), "Should have size field");
        assert!(
            schema.get_field("modified").is_ok(),
            "Should have modified field"
        );
        assert!(
            schema.get_field("is_folder").is_ok(),
            "Should have is_folder field"
        );
    }

    #[test]
    fn test_writer() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");
        let index = create_test_index(&index_path);

        let writer = index.writer();
        assert!(writer.is_ok(), "Should be able to create writer");

        let writer = writer.unwrap();
        let schema = index.get_schema();
        let name_field = schema.get_field("name").unwrap();
        let path_field = schema.get_field("path").unwrap();
        let size_field = schema.get_field("size").unwrap();
        let modified_field = schema.get_field("modified").unwrap();
        let is_folder_field = schema.get_field("is_folder").unwrap();

        let mut doc = tantivy::TantivyDocument::default();
        doc.add_text(name_field, "test.txt");
        doc.add_text(path_field, "/test.txt");
        doc.add_u64(size_field, 100);
        doc.add_date(modified_field, tantivy::DateTime::from_timestamp_secs(1000));
        doc.add_bool(is_folder_field, false);

        let result = writer.add_document(doc);
        assert!(result.is_ok(), "Should be able to add document");
    }

    #[test]
    fn test_search_text_query_basic() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");
        let index = create_test_index(&index_path);

        populate_test_index(&index).unwrap();

        let results = index.search("document", false, 10).unwrap();
        assert_eq!(results.len(), 1, "Should find exactly one match");

        let doc = &results[0];
        let schema = index.get_schema();
        let name_field = schema.get_field("name").unwrap();
        let name = doc.get_first(name_field).and_then(|v| v.as_str()).unwrap();

        assert_eq!(name, "document.txt", "Should find document.txt");
    }

    #[test]
    fn test_search_text_query_multiple_results() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");
        let index = create_test_index(&index_path);

        populate_test_index(&index).unwrap();

        let results = index.search("txt", false, 10).unwrap();
        assert!(results.len() >= 2, "Should find multiple .txt files");
    }

    #[test]
    fn test_search_text_query_no_results() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");
        let index = create_test_index(&index_path);

        populate_test_index(&index).unwrap();

        let results = index.search("nonexistent", false, 10).unwrap();
        assert_eq!(
            results.len(),
            0,
            "Should find no results for non-existent term"
        );
    }

    #[test]
    fn test_search_regex_query_basic() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");
        let index = create_test_index(&index_path);

        populate_test_index(&index).unwrap();

        let results = index.search(r"document", true, 10).unwrap();
        assert_eq!(
            results.len(),
            1,
            "Should find document.txt matching 'document' pattern"
        );

        let doc = &results[0];
        let schema = index.get_schema();
        let name_field = schema.get_field("name").unwrap();
        let name = doc.get_first(name_field).and_then(|v| v.as_str()).unwrap();

        assert_eq!(name, "document.txt", "Should find document.txt");
    }

    #[test]
    fn test_search_regex_query_no_results() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");
        let index = create_test_index(&index_path);

        populate_test_index(&index).unwrap();

        let results = index.search(r"nonexistentpattern", true, 10).unwrap();
        assert_eq!(
            results.len(),
            0,
            "Should find no results for non-matching regex"
        );
    }

    #[test]
    fn test_search_empty_query() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");
        let index = create_test_index(&index_path);

        populate_test_index(&index).unwrap();

        let results = index.search("", false, 10).unwrap();
        assert_eq!(results.len(), 0, "Empty query should return no results");

        let results = index.search("   ", false, 10).unwrap();
        assert_eq!(
            results.len(),
            0,
            "Whitespace-only query should return no results"
        );
    }

    #[test]
    fn test_search_limit() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");
        let index = create_test_index(&index_path);

        populate_test_index(&index).unwrap();

        let results1 = index.search("", false, 5).unwrap();
        let results2 = index.search("", false, 100).unwrap();
        assert_eq!(
            results1.len(),
            results2.len(),
            "Empty query should be independent of limit"
        );
    }

    #[test]
    fn test_field_boosting_name_vs_path() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");
        let index = create_test_index(&index_path);

        let schema = index.get_schema();
        let name_field = schema.get_field("name").unwrap();
        let path_field = schema.get_field("path").unwrap();
        let size_field = schema.get_field("size").unwrap();
        let modified_field = schema.get_field("modified").unwrap();
        let is_folder_field = schema.get_field("is_folder").unwrap();

        let mut writer = index.writer().unwrap();

        let mut doc1 = tantivy::TantivyDocument::default();
        doc1.add_text(name_field, "document.txt");
        doc1.add_text(path_field, "/home/user/documents/document.txt");
        doc1.add_u64(size_field, 1024);
        doc1.add_date(modified_field, tantivy::DateTime::from_timestamp_secs(1000));
        doc1.add_bool(is_folder_field, false);

        let mut doc2 = tantivy::TantivyDocument::default();
        doc2.add_text(name_field, "other.txt");
        doc2.add_text(path_field, "/home/user/documents/document.txt");
        doc2.add_u64(size_field, 1024);
        doc2.add_date(modified_field, tantivy::DateTime::from_timestamp_secs(1000));
        doc2.add_bool(is_folder_field, false);

        writer.add_document(doc1).unwrap();
        writer.add_document(doc2).unwrap();
        writer.commit().unwrap();

        let results = index.search("document", false, 10).unwrap();
        assert_eq!(results.len(), 2, "Should find both matches");

        let schema = index.get_schema();
        let name_field = schema.get_field("name").unwrap();
        let name1 = results[0]
            .get_first(name_field)
            .and_then(|v| v.as_str())
            .unwrap();
        assert_eq!(
            name1, "document.txt",
            "Name match should rank higher than path match"
        );
    }

    #[test]
    fn test_reload() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");
        let index = create_test_index(&index_path);

        let schema = index.get_schema();
        let name_field = schema.get_field("name").unwrap();
        let path_field = schema.get_field("path").unwrap();
        let size_field = schema.get_field("size").unwrap();
        let modified_field = schema.get_field("modified").unwrap();
        let is_folder_field = schema.get_field("is_folder").unwrap();

        let mut writer = index.writer().unwrap();
        let mut doc = tantivy::TantivyDocument::default();
        doc.add_text(name_field, "initial.txt");
        doc.add_text(path_field, "/initial.txt");
        doc.add_u64(size_field, 100);
        doc.add_date(modified_field, tantivy::DateTime::from_timestamp_secs(1000));
        doc.add_bool(is_folder_field, false);
        writer.add_document(doc).unwrap();
        writer.commit().unwrap();

        let results = index.search("initial", false, 10).unwrap();
        assert_eq!(results.len(), 1);

        let reload_result = index.reload();
        assert!(reload_result.is_ok(), "Reload should succeed");

        let results = index.search("initial", false, 10).unwrap();
        assert_eq!(
            results.len(),
            1,
            "Results should still be available after reload"
        );
    }

    #[test]
    fn test_search_with_folders() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");
        let index = create_test_index(&index_path);

        populate_test_index(&index).unwrap();

        let schema = index.get_schema();
        let name_field = schema.get_field("name").unwrap();
        let path_field = schema.get_field("path").unwrap();
        let size_field = schema.get_field("size").unwrap();
        let modified_field = schema.get_field("modified").unwrap();
        let is_folder_field = schema.get_field("is_folder").unwrap();

        let mut writer = index.writer().unwrap();
        let mut doc = tantivy::TantivyDocument::default();
        doc.add_text(name_field, "myfolder");
        doc.add_text(path_field, "/myfolder");
        doc.add_u64(size_field, 0);
        doc.add_date(modified_field, tantivy::DateTime::from_timestamp_secs(1000));
        doc.add_bool(is_folder_field, true);
        writer.add_document(doc).unwrap();
        writer.commit().unwrap();

        let results = index.search("folder", false, 10).unwrap();
        assert!(results.len() >= 1, "Should find folder");

        let doc = &results[0];
        let is_folder = doc
            .get_first(is_folder_field)
            .and_then(|v| v.as_bool())
            .unwrap();
        assert!(is_folder, "Result should be marked as folder");
    }

    #[test]
    fn test_index_persistence() {
        let temp_dir = tempdir().unwrap();
        let index_path = temp_dir.path().join("test_index");

        {
            let index1 = create_test_index(&index_path);
            populate_test_index(&index1).unwrap();

            let results = index1.search("document", false, 10).unwrap();
            assert_eq!(results.len(), 1, "Should find document in first index");
        }

        let index2 = create_test_index(&index_path);
        let results = index2.search("document", false, 10).unwrap();
        assert_eq!(results.len(), 1, "Should find document in reopened index");
    }
}

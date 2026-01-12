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
